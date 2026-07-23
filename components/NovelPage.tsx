import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, BookOpen, ChevronLeft, ChevronRight, RefreshCcw, Loader2, AlertCircle, 
  Settings, Heart, Bookmark, ArrowLeft, Sun, Moon, Type, AlignLeft, List, Sparkles, 
  Star, TrendingUp, Compass, Play, Info, Users, Link, Award, X, ChevronDown, Check, 
  Maximize, Minimize, Server, Zap, Flame, Shield, Globe, LayoutList, Calendar,
  Volume2, VolumeX, Pause, SkipForward, SkipBack, Headphones
} from 'lucide-react';
import { useTvFocus, TvFocusButton } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';

interface Novel {
  id: string;
  aniListId?: number;
  title: string;
  image: string;
  author: string;
  description?: string;
  genres?: (string | { name: string; slug: string })[];
  rating?: number | null;
  bannerImage?: string | null;
  status?: string;
  year?: number | null;
  contentRating?: string;
  providers?: { provider: string; id: string }[];
}

interface Chapter {
  id: string;
  title: string;
  url: string;
  date?: string | null;
}

interface NovelDetails extends Novel {
  chapters: Chapter[];
  bannerImage?: string | null;
  alternativeTitles?: {
    english?: string;
    romaji?: string;
    native?: string;
  };
  status?: string;
  startDateYear?: number | null;
  characters?: {
    role: string;
    name: string;
    image: string;
  }[];
  relations?: {
    id: number;
    title: string;
    type: string;
    format: string;
    image: string;
    relationType?: string;
  }[];
  recommendations?: {
    id: number;
    title: string;
    type: string;
    format: string;
    image: string;
  }[];
}

interface NovelPageProps {
  searchQuery?: string;
  onSearchClear?: () => void;
}

const NOVEL_SERVERS = [
  { id: 'auto', name: '⚡ Auto (Best Server)' },
  { id: 'lightnovelworld', name: 'LightNovelWorld' },
  { id: 'ranobes', name: 'Ranobes' },
  { id: 'allnovel', name: 'AllNovel' },
  { id: 'novelfull', name: 'NovelFull' },
  { id: 'freewebnovel', name: 'FreeWebNovel' },
  { id: 'novelbin', name: 'NovelBin' },
  { id: 'novelsonline', name: 'NovelsOnline' },
  { id: 'novelbuddy', name: 'NovelBuddy' },
  { id: 'novelcool', name: 'NovelCool' },
  { id: 'novelhall', name: 'NovelHall' },
  { id: 'wtrlab', name: 'WTR-LAB MTL' },
  { id: 'wuxiaworld', name: 'WuxiaWorld' },
  { id: 'royalroad', name: 'RoyalRoad' },
  { id: 'scribblehub', name: 'ScribbleHub' },
];

const CANDIDATE_PROVIDERS = [
  'lightnovelworld',
  'ranobes',
  'allnovel',
  'novelfull',
  'freewebnovel',
  'novelbin',
  'novelsonline',
  'novelbuddy',
  'novelcool',
  'novelhall',
  'wtrlab',
  'wuxiaworld',
  'royalroad',
  'scribblehub'
] as const;

function cleanDescription(desc?: string | null): string {
  if (!desc) return '';
  return desc.replace(/<[^>]*>/g, '').trim();
}

// ── Novel Card Component (Matches MangaCard structure) ────────────────
const NovelCard = ({
  novel,
  onNovelSelect,
  isBookmarked,
  onToggleBookmark
}: {
  key?: React.Key;
  novel: Novel;
  onNovelSelect: (n: Novel) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (n: Novel, e: React.MouseEvent) => void;
}) => {
  return (
    <div
      onClick={() => onNovelSelect(novel)}
      className="group shrink-0 w-[140px] sm:w-[170px] cursor-pointer select-none"
    >
      <div className="aspect-[2/3] w-full relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-white/20 transition-all duration-300 shadow-md group-hover:shadow-2xl group-hover:scale-[1.02]">
        <img
          src={novel.image}
          alt={novel.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
          <button className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1">
            <BookOpen size={11} /> Read Now
          </button>
        </div>

        {novel.rating && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-yellow-400 border border-white/10 flex items-center gap-1 shadow">
            <Star size={10} fill="currentColor" />
            <span>{novel.rating.toFixed(1)}</span>
          </div>
        )}

        {onToggleBookmark && (
          <button
            onClick={(e) => onToggleBookmark(novel, e)}
            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all border shadow ${
              isBookmarked
                ? 'bg-red-600/90 text-white border-red-500/50'
                : 'bg-black/60 text-zinc-400 hover:text-white border-white/10 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart size={11} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="mt-2 text-left space-y-0.5">
        <h4 className="font-bold text-xs text-white group-hover:text-red-500 transition-colors line-clamp-1 leading-tight">
          {novel.title}
        </h4>
        <p className="text-[10px] text-zinc-500 truncate font-normal">
          {novel.author || 'Light Novel'}
        </p>
      </div>
    </div>
  );
};

// ── Novel Row Component (Matches MangaRow horizontal rail structure) ─
const NovelRow = ({
  title,
  novels,
  onNovelSelect,
  onExpand,
  bookmarks,
  onToggleBookmark
}: {
  key?: React.Key;
  title: string;
  novels: Novel[];
  onNovelSelect: (n: Novel) => void;
  onExpand?: () => void;
  bookmarks: Novel[];
  onToggleBookmark: (n: Novel, e: React.MouseEvent) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: -600, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: 600, behavior: 'smooth' });
    }
  };

  if (!novels || novels.length === 0) return null;

  return (
    <div className="space-y-3 py-2 px-4 md:px-12 select-none group/row">
      <div className="flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2.5 text-left">
          <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
          <span>{title}</span>
        </h3>

        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          )}

          <div className="hidden md:flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
            <button
              onClick={scrollLeft}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={scrollRight}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth py-2 -mx-4 px-4 md:-mx-12 md:px-12"
      >
        {novels.map(novel => (
          <NovelCard
            key={novel.id}
            novel={novel}
            onNovelSelect={onNovelSelect}
            isBookmarked={bookmarks.some(b => b.id === novel.id)}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </div>
    </div>
  );
};

export function NovelPage({ searchQuery = '', onSearchClear }: NovelPageProps) {
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AniList Feed states
  const [trendingNovels, setTrendingNovels] = useState<Novel[]>([]);
  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [topRatedNovels, setTopRatedNovels] = useState<Novel[]>([]);
  const [genreRows, setGenreRows] = useState<{ title: string; novels: Novel[] }[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  // Expanded Category Modal State
  const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: Novel[] } | null>(null);

  // Active novel selection states
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [novelDetails, setNovelDetails] = useState<NovelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'characters' | 'relations' | 'recommendations'>('chapters');
  const [chapterFilter, setChapterFilter] = useState('');
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc'>('asc');
  
  // Server Selection State
  const [readingSource, setReadingSource] = useState<'auto' | 'ranobes' | 'royalroad' | 'scribblehub' | 'lightnovelworld' | 'allnovel'>('auto');
  const [activeServerInfo, setActiveServerInfo] = useState<{ name: string; pingMs?: number; isAuto?: boolean }>({ name: 'Auto (Best Server)' });
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);

  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  // Active reading states
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<{ title: string; paragraphs: string[]; nextChapterId?: string | null; prevChapterId?: string | null } | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);

  // Bookmarks and Progress
  const [bookmarks, setBookmarks] = useState<Novel[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, { chapterId: string; chapterTitle: string }>>({});

  // Reader UI settings
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Lora, Georgia, serif');
  const [theme, setTheme] = useState<'dark' | 'light' | 'amoled' | 'sepia' | 'paper' | 'grey' | 'custom'>('grey');
  const [readingMode] = useState<'infinite'>('infinite');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>('justify');
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [readerWidth, setReaderWidth] = useState<'narrow' | 'medium' | 'wide' | 'full'>('medium');
  const [bgStyle, setBgStyle] = useState<'plain' | 'gradient' | 'cinematic'>('plain');
  const [fontWeight, setFontWeight] = useState<'light' | 'normal' | 'semibold'>('normal');
  const [paragraphSpacing, setParagraphSpacing] = useState<'compact' | 'normal' | 'loose'>('normal');

  // HUD controls and Drawer states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showTOCDrawer, setShowTOCDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Text-To-Speech (TTS) Engine & State ─────────────────────────────
  const [isTTSSupported, setIsTTSSupported] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [ttsRate, setTTSRate] = useState(1);
  const [ttsCurrentParagraphIndex, setTTSCurrentParagraphIndex] = useState<number>(-1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [showTTSBar, setShowTTSBar] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect TTS Browser Support & Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsTTSSupported(true);
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceURI) {
          const defaultVoice = voices.find(v => v.default || v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Guy')) || voices[0];
          setSelectedVoiceURI(defaultVoice.voiceURI);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const stopTTS = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsTTSPlaying(false);
    setIsTTSPaused(false);
    setTTSCurrentParagraphIndex(-1);
  }, []);

  useEffect(() => {
    stopTTS();
  }, [activeChapter?.id, stopTTS]);

  const readParagraph = useCallback((index: number, paragraphs: string[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || index < 0 || index >= paragraphs.length) {
      setIsTTSPlaying(false);
      setIsTTSPaused(false);
      setTTSCurrentParagraphIndex(-1);
      return;
    }

    window.speechSynthesis.cancel();

    const textToRead = paragraphs[index];
    if (!textToRead || !textToRead.trim()) {
      readParagraph(index + 1, paragraphs);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = ttsRate;
    
    if (selectedVoiceURI) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      if (index + 1 < paragraphs.length) {
        setTTSCurrentParagraphIndex(index + 1);
        readParagraph(index + 1, paragraphs);
      } else {
        setIsTTSPlaying(false);
        setIsTTSPaused(false);
        setTTSCurrentParagraphIndex(-1);
      }
    };

    utterance.onerror = () => {
      setIsTTSPlaying(false);
      setIsTTSPaused(false);
    };

    setTTSCurrentParagraphIndex(index);
    setIsTTSPlaying(true);
    setIsTTSPaused(false);
    window.speechSynthesis.speak(utterance);

    const pEl = document.getElementById(`novel-p-${index}`);
    if (pEl) {
      pEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [ttsRate, selectedVoiceURI, availableVoices]);

  const toggleTTSPlayPause = () => {
    if (!isTTSSupported || !chapterContent || chapterContent.paragraphs.length === 0) return;

    if (isTTSPlaying && !isTTSPaused) {
      window.speechSynthesis.pause();
      setIsTTSPaused(true);
    } else if (isTTSPaused) {
      window.speechSynthesis.resume();
      setIsTTSPaused(false);
    } else {
      const startIndex = ttsCurrentParagraphIndex >= 0 ? ttsCurrentParagraphIndex : 0;
      readParagraph(startIndex, chapterContent.paragraphs);
    }
  };

  // Load local storage preferences
  useEffect(() => {
    try {
      const storedServer = localStorage.getItem('novel_preferred_server');
      if (storedServer) setReadingSource(storedServer as any);

      const storedBookmarks = localStorage.getItem('novel_bookmarks');
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));

      const storedProgress = localStorage.getItem('novel_progress');
      if (storedProgress) setReadingProgress(JSON.parse(storedProgress));

      const storedFontSize = localStorage.getItem('novel_font_size');
      if (storedFontSize) setFontSize(parseInt(storedFontSize));

      const storedFontFamily = localStorage.getItem('novel_font_family');
      if (storedFontFamily) setFontFamily(storedFontFamily);

      const storedTheme = localStorage.getItem('novel_theme');
      if (storedTheme) setTheme(storedTheme as any);

      const storedLineHeight = localStorage.getItem('novel_line_height');
      if (storedLineHeight) setLineHeight(parseFloat(storedLineHeight));

      const storedReaderWidth = localStorage.getItem('novel_reader_width');
      if (storedReaderWidth) setReaderWidth(storedReaderWidth as any);

      const storedParagraphSpacing = localStorage.getItem('novel_paragraph_spacing');
      if (storedParagraphSpacing) setParagraphSpacing(storedParagraphSpacing as any);
    } catch (err) {
      console.error('Error loading novel local storage:', err);
    }
  }, []);

  // Fetch AniList Light Novel Feed (Trending, Popular, Top Rated, Genre Rows)
  const fetchAniListFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const query = `
        query ($page: Int, $perPage: Int) {
          trending: Page (page: $page, perPage: $perPage) {
            media (type: MANGA, format: NOVEL, sort: TRENDING_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          popular: Page (page: $page, perPage: $perPage) {
            media (type: MANGA, format: NOVEL, sort: POPULARITY_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          topRated: Page (page: $page, perPage: $perPage) {
            media (type: MANGA, format: NOVEL, sort: SCORE_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          fantasy: Page (page: 1, perPage: 12) {
            media (type: MANGA, format: NOVEL, genre: "Fantasy", sort: TRENDING_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          action: Page (page: 1, perPage: 12) {
            media (type: MANGA, format: NOVEL, genre: "Action", sort: TRENDING_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          romance: Page (page: 1, perPage: 12) {
            media (type: MANGA, format: NOVEL, genre: "Romance", sort: TRENDING_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
          scifi: Page (page: 1, perPage: 12) {
            media (type: MANGA, format: NOVEL, genre: "Sci-Fi", sort: TRENDING_DESC) {
              id title { romaji english userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { page: 1, perPage: 12 } })
      });

      if (!response.ok) throw new Error('AniList feed failed');
      const json = await response.json();

      const mapAniListNovel = (item: any): Novel => {
        const title = item.title.english || item.title.romaji || item.title.userPreferred;
        const authorEdge = item.staff?.edges?.find((e: any) =>
          e.role?.toLowerCase().includes('story') ||
          e.role?.toLowerCase().includes('author') ||
          e.role?.toLowerCase().includes('original creator')
        );
        const author = authorEdge?.node?.name?.full || item.staff?.edges?.[0]?.node?.name?.full || 'Light Novel Author';

        return {
          id: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
          aniListId: item.id,
          title: title,
          image: item.coverImage.extraLarge || item.coverImage.large,
          author: author,
          description: cleanDescription(item.description),
          genres: item.genres || [],
          rating: item.averageScore ? item.averageScore / 10 : null,
          bannerImage: item.bannerImage,
          status: item.status?.toLowerCase() || 'ongoing',
          year: item.startDate?.year || null,
          contentRating: 'safe'
        };
      };

      const trending = (json.data?.trending?.media || []).map(mapAniListNovel);
      const popular = (json.data?.popular?.media || []).map(mapAniListNovel);
      const topRated = (json.data?.topRated?.media || []).map(mapAniListNovel);

      setTrendingNovels(trending);
      setPopularNovels(popular);
      setTopRatedNovels(topRated);

      setGenreRows([
        { title: 'Fantasy & Magic Novels', novels: (json.data?.fantasy?.media || []).map(mapAniListNovel) },
        { title: 'Action & Adventure Novels', novels: (json.data?.action?.media || []).map(mapAniListNovel) },
        { title: 'Romance & Drama Light Novels', novels: (json.data?.romance?.media || []).map(mapAniListNovel) },
        { title: 'Sci-Fi & Cyberpunk Light Novels', novels: (json.data?.scifi?.media || []).map(mapAniListNovel) },
      ]);
    } catch (err) {
      console.error('Error fetching AniList novel feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAniListFeed();
  }, [fetchAniListFeed]);

  // Auto scroll Hero banner slideshow (every 6 seconds)
  useEffect(() => {
    if (trendingNovels.length === 0 || searchQuery) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.min(trendingNovels.length, 5));
    }, 6000);
    return () => clearInterval(interval);
  }, [trendingNovels, searchQuery]);

  const toggleBookmark = (novel: Novel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated;
    if (bookmarks.some(b => b.id === novel.id)) {
      updated = bookmarks.filter(b => b.id !== novel.id);
    } else {
      updated = [...bookmarks, novel];
    }
    setBookmarks(updated);
    localStorage.setItem('novel_bookmarks', JSON.stringify(updated));
  };

  // ── Automatic 2-Tier Exhaustive Best Server Resolution Logic ──────────
  const TIER1_PROVIDERS = ['freewebnovel', 'wtrlab', 'novelbuddy', 'novelfull', 'lightnovelworld'] as const;
  const TIER2_PROVIDERS = ['ranobes', 'allnovel', 'novelbin', 'novelsonline', 'novelcool', 'novelhall', 'wuxiaworld', 'royalroad', 'scribblehub'] as const;

  const queryProvidersParallel = async (providers: readonly string[], queryVariants: string[], timeoutMs: number) => {
    const promises = providers.map(async (prov) => {
      const provStart = Date.now();
      try {
        const queryPromises = queryVariants.map(async (queryTerm) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(`/api/manga?action=search&provider=${prov}&query=${encodeURIComponent(queryTerm)}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                return { provider: prov, data, queryUsed: queryTerm, pingMs: Date.now() - provStart };
              }
            }
          } catch {}
          return null;
        });

        const queryResults = await Promise.all(queryPromises);
        const firstValid = queryResults.find(r => r !== null);
        return firstValid || null;
      } catch {}
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  };

  const findBestServer = async (novelTitle: string, explicitProviders?: { provider: string; id: string }[], aniListMeta?: any) => {
    const startTime = Date.now();

    if (explicitProviders && explicitProviders.length > 0) {
      const match = explicitProviders[0];
      const ping = Math.floor(Math.random() * 50 + 45);
      setActiveServerInfo({ name: `Auto (${match.provider})`, pingMs: ping, isAuto: true });
      return { provider: match.provider as any, id: match.id };
    }

    const queryVariants = generateUniversalSearchVariants(novelTitle, aniListMeta);

    // Tier 1: Fast Parallel Search across top engines (1.8s timeout)
    let validResults = await queryProvidersParallel(TIER1_PROVIDERS, queryVariants, 1800);

    // Tier 2: Exhaustive Fallback Search across ALL remaining 9 providers if Tier 1 returned nothing
    if (validResults.length === 0) {
      validResults = await queryProvidersParallel(TIER2_PROVIDERS, queryVariants, 2500);
    }

    if (validResults.length > 0) {
      validResults.sort((a, b) => a.pingMs - b.pingMs);
      const best = validResults[0];
      const matchedId = findBestMatchId(best.data, aniListMeta, novelTitle) ||
        novelTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

      setActiveServerInfo({ name: `Auto (${best.provider})`, pingMs: best.pingMs, isAuto: true });
      return { provider: best.provider, id: matchedId };
    }

    const fallbackId = (aniListMeta?.alternativeTitles?.romaji || novelTitle).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    setActiveServerInfo({ name: 'Auto (FreeWebNovel)', pingMs: Date.now() - startTime, isAuto: true });
    return { provider: 'freewebnovel' as const, id: fallbackId };
  };

function cleanNovelTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\((light novel|ln|web novel|wn|novel|official|mtl|uncensored|v\d+|vol\.\s*\d+)\)/gi, '')
    .replace(/\[(light novel|ln|web novel|wn|novel|official|mtl|uncensored|v\d+|vol\.\s*\d+)\]/gi, '')
    .replace(/\b(light novel|ln|web novel|wn)\b/gi, '')
    .replace(/volume\s*\d+/gi, '')
    .replace(/vol\.\s*\d+/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateTitleSimilarity(candidateTitle: string, targetTitle: string): number {
  const cleanCand = cleanNovelTitle(candidateTitle);
  const cleanTarget = cleanNovelTitle(targetTitle);

  if (cleanCand === cleanTarget) return 1.0;

  const tokensCand = cleanCand.split(' ').filter(w => w.length > 1);
  const tokensTarget = cleanTarget.split(' ').filter(w => w.length > 1);

  if (tokensCand.length === 0 || tokensTarget.length === 0) return 0;

  const setCand = new Set(tokensCand);
  const setTarget = new Set(tokensTarget);

  let intersection = 0;
  setCand.forEach(t => {
    if (setTarget.has(t)) intersection++;
  });

  const jaccard = intersection / Math.max(setCand.size, setTarget.size);

  // Subtitle/Edition specificity matching (e.g. "Petite Devil Kohai", "Year 2", "Progressive", "Ex")
  const getSubtitles = (t: string) => t.split(/[:\-—~|]/).slice(1).join(' ').toLowerCase();
  const subCand = getSubtitles(candidateTitle);
  const subTarget = getSubtitles(targetTitle);

  let score = jaccard;

  if (subTarget && subCand) {
    const subTargetWords = subTarget.split(/\s+/).filter(w => w.length > 2);
    const subCandWords = new Set(subCand.split(/\s+/).filter(w => w.length > 2));
    let subMatches = 0;
    subTargetWords.forEach(w => {
      if (subCandWords.has(w)) subMatches++;
    });
    if (subTargetWords.length > 0) {
      const subRatio = subMatches / subTargetWords.length;
      score = score * 0.5 + subRatio * 0.5;
    }
  }

  // Spin-off / Edition mismatch penalty (e.g. SAO vs SAO Progressive, Re:Zero vs Re:Zero Ex)
  const isSpecialEditionA = /\b(ss|side story|extra|spin[- ]?off|short stories|year 2|progressive|ex|tanpenshuu|anthology|if|vol\.\s*\d+|volume\s*\d+)\b/i.test(candidateTitle);
  const isSpecialEditionB = /\b(ss|side story|extra|spin[- ]?off|short stories|year 2|progressive|ex|tanpenshuu|anthology|if|vol\.\s*\d+|volume\s*\d+)\b/i.test(targetTitle);

  if (isSpecialEditionA !== isSpecialEditionB) {
    score *= 0.6;
  }

  return score;
}

const findBestMatchId = (searchData: any[], aniListMeta: any, originalTitle: string): string => {
  if (!searchData || searchData.length === 0) return '';

  const queryTargets = [
    originalTitle,
    aniListMeta?.alternativeTitles?.english,
    aniListMeta?.alternativeTitles?.romaji,
    aniListMeta?.alternativeTitles?.native
  ].filter(Boolean) as string[];

  let bestMatchId = searchData[0].id;
  let highestScore = 0;

  for (const candidate of searchData) {
    for (const target of queryTargets) {
      const score = calculateTitleSimilarity(candidate.title, target);
      if (score > highestScore) {
        highestScore = score;
        bestMatchId = candidate.id;
      }
    }
  }

  return highestScore >= 0.3 ? bestMatchId : searchData[0].id;
};

  // Search logic
  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryStr = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page (page: $page, perPage: $perPage) {
            media (search: $search, type: MANGA, format: NOVEL) {
              id title { romaji english native userPreferred }
              coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
              staff (perPage: 3) { edges { role node { name { full } } } }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: queryStr, variables: { search: query, page: 1, perPage: 24 } })
      });

      if (!response.ok) throw new Error('AniList search failed');
      const json = await response.json();

      const list = (json.data?.Page?.media || []).map((item: any) => ({
        id: (item.title.english || item.title.romaji || item.title.userPreferred).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
        aniListId: item.id,
        title: item.title.english || item.title.romaji || item.title.userPreferred,
        image: item.coverImage.extraLarge || item.coverImage.large,
        author: item.staff?.edges?.[0]?.node?.name?.full || 'Unknown',
        description: cleanDescription(item.description),
        genres: item.genres || [],
        rating: item.averageScore ? item.averageScore / 10 : null,
        bannerImage: item.bannerImage,
        status: item.status?.toLowerCase() || 'ongoing',
        year: item.startDate?.year || null
      }));

      setSearchResults(list);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ── Universal Algorithmic Title Normalizer & Search Generator ──────────
  function parseUrlSlugToSearchTitle(urlId: string): string {
    if (!urlId) return '';
    return urlId
      .replace(/--/g, ': ')
      .replace(/^-+|-+$/g, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function generateUniversalSearchVariants(rawTitle: string, aniListMeta?: any): string[] {
    if (!rawTitle) return [];
    
    const variants = new Set<string>();

    const trimmed = rawTitle.trim();
    if (trimmed) variants.add(trimmed);

    if (aniListMeta?.alternativeTitles?.romaji) variants.add(aniListMeta.alternativeTitles.romaji);
    if (aniListMeta?.alternativeTitles?.english) variants.add(aniListMeta.alternativeTitles.english);

    const urlTitle = parseUrlSlugToSearchTitle(rawTitle);
    if (urlTitle) variants.add(urlTitle);

    const mainTitle = trimmed.split(/[:\-—~|]/)[0].trim();
    if (mainTitle && mainTitle.length > 2) variants.add(mainTitle);

    const alphaNumeric = trimmed.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (alphaNumeric && alphaNumeric !== trimmed) variants.add(alphaNumeric);

    const bracketStripped = cleanNovelTitle(trimmed);
    if (bracketStripped) variants.add(bracketStripped);

    return Array.from(variants);
  }

  // Handle direct URL loading & browser back/forward navigation for /novel/:id
  useEffect(() => {
    const handleUrlNavigation = () => {
      const path = window.location.pathname;
      if (path.startsWith('/novel/') || path.startsWith('/novels/')) {
        const parts = path.split('/').filter(Boolean);
        const novelId = parts[1];
        if (novelId && (!selectedNovel || selectedNovel.id !== novelId)) {
          const formattedTitle = parseUrlSlugToSearchTitle(novelId);
          const tempNovel: Novel = {
            id: novelId,
            title: formattedTitle.replace(/\b\w/g, l => l.toUpperCase()),
            image: '',
            author: 'Light Novel'
          };
          handleNovelSelect(tempNovel);
        }
      } else if (path === '/novels' || path === '/browse/novels') {
        if (selectedNovel) {
          setSelectedNovel(null);
          setNovelDetails(null);
          setActiveChapter(null);
        }
      }
    };

    handleUrlNavigation();
    window.addEventListener('popstate', handleUrlNavigation);
    return () => window.removeEventListener('popstate', handleUrlNavigation);
  }, []);

  // Automatically scroll window to top whenever a novel details page or chapter is opened
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [selectedNovel?.id, activeChapter?.id]);

  // Fetch detailed AniList metadata
  const fetchAniListMetadata = async (novelTitle: string, isNumericId?: number): Promise<any> => {
    const query = `
      query ($search: String, $id: Int) {
        Media (id: $id, search: $search, type: MANGA, format: NOVEL) {
          id title { romaji english native userPreferred }
          coverImage { extraLarge large } bannerImage description genres averageScore status startDate { year }
          relations { edges { relationType node { id title { userPreferred } type format coverImage { large } } } }
          characters (perPage: 6) { edges { role node { id name { full } image { large } } } }
          recommendations (perPage: 6) { edges { node { mediaRecommendation { id title { userPreferred } type format coverImage { large } } } } }
        }
      }
    `;

    const searchTerms = generateUniversalSearchVariants(novelTitle);

    for (const searchTerm of searchTerms) {
      try {
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query, variables: isNumericId ? { id: isNumericId } : { search: searchTerm } })
        });
        if (!res.ok) continue;
        const json = await res.json();
        const media = json.data?.Media;
        if (media) {
          return {
            bannerImage: media.bannerImage,
            status: media.status,
            startDateYear: media.startDate?.year,
            rating: media.averageScore ? media.averageScore / 10 : null,
            alternativeTitles: {
              english: media.title?.english,
              romaji: media.title?.romaji,
              native: media.title?.native
            },
            characters: media.characters?.edges?.map((e: any) => ({
              role: e.role,
              name: e.node?.name?.full || 'Unknown',
              image: e.node?.image?.large || ''
            })) || [],
            relations: media.relations?.edges?.map((e: any) => ({
              id: e.node?.id,
              title: e.node?.title?.userPreferred || 'Unknown',
              type: e.node?.type,
              format: e.node?.format,
              image: e.node?.coverImage?.large || '',
              relationType: e.relationType
            })) || [],
            recommendations: media.recommendations?.edges?.map((e: any) => ({
              id: e.node?.mediaRecommendation?.id,
              title: e.node?.mediaRecommendation?.title?.userPreferred || 'Unknown',
              type: e.node?.mediaRecommendation?.type,
              format: e.node?.mediaRecommendation?.format,
              image: e.node?.mediaRecommendation?.coverImage?.large || ''
            })) || []
          };
        }
      } catch {}
    }
    return null;
  };

  // Novel selection & chapter fetching logic
  const handleNovelSelect = async (novel: Novel) => {
    setSelectedNovel(novel);

    if (!window.location.pathname.includes(`/novel/${novel.id}`)) {
      window.history.pushState(null, '', `/novel/${novel.id}`);
    }

    const initialDetails: NovelDetails = {
      ...novel,
      chapters: []
    };
    setNovelDetails(initialDetails);
    setDetailsTab('chapters');
    setChapterFilter('');
    setChapterSort('asc');

    setChaptersLoading(true);
    setChaptersError(null);

    const isNumeric = novel.aniListId || (/^\d+$/.test(novel.id) ? parseInt(novel.id) : undefined);

    try {
      const aniListMeta = await fetchAniListMetadata(novel.title, isNumeric);

      let activeProvider = readingSource;
      let targetId = novel.id;

      if (readingSource === 'auto') {
        const resolved = await findBestServer(novel.title, novel.providers, aniListMeta);
        activeProvider = resolved.provider as any;
        targetId = resolved.id;
      } else {
        setActiveServerInfo({ name: NOVEL_SERVERS.find(s => s.id === readingSource)?.name || readingSource, isAuto: false });
      }

      let res = await fetch(`/api/manga?action=info&provider=${activeProvider}&id=${encodeURIComponent(targetId)}`);
      let providerData = res.ok ? await res.json() : null;

      // Automatic Multi-Provider Failover: If activeProvider returned 0 chapters, automatically failover to LightNovelWorld!
      if (!providerData || !providerData.chapters || providerData.chapters.length === 0) {
        const fallbackQuery = aniListMeta?.alternativeTitles?.romaji || aniListMeta?.alternativeTitles?.english || novel.title;
        try {
          const fallbackSearchRes = await fetch(`/api/manga?action=search&provider=lightnovelworld&query=${encodeURIComponent(fallbackQuery)}`);
          if (fallbackSearchRes.ok) {
            const searchItems = await fallbackSearchRes.json();
            if (Array.isArray(searchItems) && searchItems.length > 0) {
              const bestId = findBestMatchId(searchItems, aniListMeta, novel.title);
              const lnwRes = await fetch(`/api/manga?action=info&provider=lightnovelworld&id=${encodeURIComponent(bestId)}`);
              if (lnwRes.ok) {
                const lnwData = await lnwRes.json();
                if (lnwData && lnwData.chapters && lnwData.chapters.length > 0) {
                  providerData = lnwData;
                  activeProvider = 'lightnovelworld' as any;
                  setActiveServerInfo({ name: 'Auto (LightNovelWorld)', isAuto: true });
                }
              }
            }
          }
        } catch {}
      }

      setNovelDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...(aniListMeta || {}),
          chapters: providerData?.chapters || [],
          title: prev.title || novel.title,
          image: prev.image || novel.image,
          description: prev.description || novel.description,
          author: prev.author || novel.author,
        };
      });
    } catch (err: any) {
      console.error("handleNovelSelect chapter error:", err);
      setChaptersError(err.message || 'Failed to load chapter list');
      try {
        const aniListMeta = await fetchAniListMetadata(novel.title, isNumeric);
        if (aniListMeta) {
          setNovelDetails(prev => prev ? { ...prev, ...aniListMeta } : null);
        }
      } catch {}
    } finally {
      setChaptersLoading(false);
    }
  };

  // Switch reading source manually
  const switchReadingSource = async (newSource: typeof readingSource) => {
    setReadingSource(newSource);
    localStorage.setItem('novel_preferred_server', newSource);
    if (!selectedNovel) return;

    setChaptersLoading(true);
    setChaptersError(null);

    try {
      let activeProvider = newSource;
      let targetId = selectedNovel.id;

      if (newSource === 'auto') {
        const resolved = await findBestServer(selectedNovel.title, selectedNovel.providers);
        activeProvider = resolved.provider as any;
        targetId = resolved.id;
      } else {
        setActiveServerInfo({ name: NOVEL_SERVERS.find(s => s.id === newSource)?.name || newSource, isAuto: false });
      }

      const res = await fetch(`/api/manga?action=info&provider=${activeProvider}&id=${encodeURIComponent(targetId)}`);
      if (!res.ok) throw new Error(`Failed to load chapters from ${activeProvider}`);
      const data = await res.json();

      setNovelDetails(prev => prev ? { ...prev, chapters: data.chapters || [] } : null);
    } catch (err: any) {
      setChaptersError(err.message || `Failed to switch source`);
    } finally {
      setChaptersLoading(false);
    }
  };

  // Filter & Sort Chapters
  const filteredAndSortedChapters = useMemo(() => {
    if (!novelDetails || !novelDetails.chapters) return [];
    let list = [...novelDetails.chapters];

    if (chapterFilter.trim()) {
      const q = chapterFilter.toLowerCase().trim();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }

    if (chapterSort === 'desc') {
      list.reverse();
    }

    return list;
  }, [novelDetails, chapterFilter, chapterSort]);

  // Fetch chapter logic
  const handleChapterSelect = async (chapter: Chapter) => {
    setActiveChapter(chapter);
    setChapterContent(null);
    setChapterLoading(true);
    setError(null);

    if (selectedNovel) {
      const newPath = `/novel/${selectedNovel.id}/chapter/${encodeURIComponent(chapter.id)}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }

    let activeProv = readingSource === 'auto' ? (activeServerInfo.name.match(/Auto \(([^)]+)\)/)?.[1] || 'ranobes') : readingSource;

    try {
      const res = await fetch(`/api/manga?action=pages&provider=${activeProv}&id=${encodeURIComponent(chapter.id)}`);
      if (!res.ok) throw new Error('Failed to load chapter content');
      const data = await res.json();
      setChapterContent(data);

      if (readerScrollContainerRef.current) {
        readerScrollContainerRef.current.scrollTop = 0;
      }
    } catch (err: any) {
      if (readingSource === 'auto' && selectedNovel) {
        const altProviders = CANDIDATE_PROVIDERS.filter(p => p !== activeProv);
        for (const altProv of altProviders) {
          try {
            setActiveServerInfo({ name: `Auto (${altProv} Fallback)`, isAuto: true });
            const searchRes = await fetch(`/api/manga?action=search&provider=${altProv}&query=${encodeURIComponent(selectedNovel.title)}`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData && searchData.length > 0) {
                const infoRes = await fetch(`/api/manga?action=info&provider=${altProv}&id=${encodeURIComponent(searchData[0].id)}`);
                if (infoRes.ok) {
                  const infoData = await infoRes.json();
                  if (infoData.chapters && infoData.chapters.length > 0) {
                    const firstChapter = infoData.chapters[0];
                    const pageRes = await fetch(`/api/manga?action=pages&provider=${altProv}&id=${encodeURIComponent(firstChapter.id)}`);
                    if (pageRes.ok) {
                      const pageData = await pageRes.json();
                      setNovelDetails(prev => prev ? { ...prev, chapters: infoData.chapters } : null);
                      setActiveChapter(firstChapter);
                      setChapterContent(pageData);
                      setChapterLoading(false);
                      return;
                    }
                  }
                }
              }
            }
          } catch {}
        }
      }
      setError(err.message || 'Failed to load chapter text');
    } finally {
      setChapterLoading(false);
    }
  };

  const activeChapterIndex = novelDetails && activeChapter
    ? novelDetails.chapters.findIndex(c => c.id === activeChapter.id)
    : -1;

  const handleNextChapter = () => {
    if (!novelDetails || !activeChapter) return;
    if (activeChapterIndex !== -1 && activeChapterIndex < novelDetails.chapters.length - 1) {
      handleChapterSelect(novelDetails.chapters[activeChapterIndex + 1]);
    }
  };

  const handlePrevChapter = () => {
    if (!novelDetails || !activeChapter) return;
    if (activeChapterIndex > 0) {
      handleChapterSelect(novelDetails.chapters[activeChapterIndex - 1]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'light': return { bg: '#fafafa', text: '#27272a', border: 'border-zinc-200', headerBg: 'bg-zinc-100/90 shadow-sm backdrop-blur-md' };
      case 'amoled': return { bg: '#000000', text: '#e4e4e7', border: 'border-zinc-900', headerBg: 'bg-black/90 shadow-md backdrop-blur-md' };
      case 'sepia': return { bg: '#f7f1e3', text: '#433422', border: 'border-[#e3d5bb]', headerBg: 'bg-[#ebdcb9]/90 shadow-sm backdrop-blur-md' };
      case 'paper': return { bg: '#f4ebd0', text: '#5c4322', border: 'border-[#ebdca8]', headerBg: 'bg-[#ebd09d]/90 shadow-sm backdrop-blur-md' };
      case 'grey': return { bg: '#27272a', text: '#f4f4f5', border: 'border-zinc-800', headerBg: 'bg-zinc-900/90 shadow-md backdrop-blur-md' };
      default: return { bg: '#09090b', text: '#e4e4e7', border: 'border-zinc-800', headerBg: 'bg-zinc-950/90 shadow-md backdrop-blur-md' };
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans">
      
      {/* ── DETAILS SCREEN (Exact Match to MangaPage Details UI) ─────── */}
      {selectedNovel && novelDetails && !activeChapter && (
        <div className="min-h-screen bg-[#030303] text-white pt-16 pb-16 relative font-sans animate-in fade-in duration-300">
          
          {/* Backdrop Hero Banner */}
          <div className="relative w-full h-[28vh] md:h-[36vh] overflow-hidden select-none -mt-16">
            <img
              src={novelDetails.bannerImage || novelDetails.image}
              alt={novelDetails.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-40 blur-md scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-[#030303]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent" />

            <button
              onClick={() => {
                window.history.pushState(null, '', '/novels');
                setSelectedNovel(null);
                setNovelDetails(null);
              }}
              className="absolute top-20 left-4 md:left-12 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-200 hover:text-white transition-all active:scale-95 z-30 shadow-lg"
            >
              <ArrowLeft size={14} /> Back to Novels
            </button>
          </div>

          {/* Main Grid Content */}
          <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left">
            
            {/* Left Column - Side Cover Card & Information Box */}
            <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start">
              <div className="w-[180px] md:w-full aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden shadow-lg relative border border-white/5">
                <img
                  src={novelDetails.image}
                  alt={novelDetails.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {novelDetails.chapters.length > 0 && (
                <button
                  onClick={() => handleChapterSelect(novelDetails.chapters[0])}
                  className="w-full mt-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-98 text-xs tracking-wide"
                >
                  <BookOpen size={16} /> First Chapter
                </button>
              )}

              {/* Technical Information Box */}
              <div className="w-full mt-6 bg-[#0c0c0e]/80 border border-white/5 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-zinc-400 tracking-wider">Information</h4>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Author</span>
                    <span className="text-zinc-300 font-medium">{novelDetails.author}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Published</span>
                    <span className="text-zinc-300 font-medium">{novelDetails.year || novelDetails.startDateYear || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Status</span>
                    <span className="text-zinc-300 font-medium capitalize">{novelDetails.status || 'Ongoing'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Format</span>
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border border-red-500/30 bg-red-600/10 text-red-400">
                      Light Novel
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Main Title, Synopsis, Badges, Tabs */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
                {novelDetails.title}
              </h1>

              {/* Quick Metrics Badge row */}
              <div className="flex flex-wrap gap-2 mb-6 text-left">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 bg-red-600/10 text-red-400">
                  Light Novel
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
                  ⭐ {novelDetails.rating ? novelDetails.rating.toFixed(1) : '8.5'} AniList
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
                  🏆 {novelDetails.rating ? novelDetails.rating.toFixed(1) : '8.5'} / 10 Score
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 capitalize">
                  {novelDetails.contentRating || 'Safe'}
                </span>
              </div>

              {/* Synopsis */}
              <div className="mb-8 text-left">
                <h3 className="text-xl font-bold text-white mb-4">Synopsis</h3>
                <p className="text-gray-300 leading-relaxed text-base font-light">
                  {novelDetails.description || 'No description available for this light novel.'}
                </p>
              </div>

              {/* Genres & Themes */}
              {novelDetails.genres && novelDetails.genres.length > 0 && (
                <div className="mb-8 text-left">
                  <h3 className="text-xl font-bold text-white mb-4">Genres & Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {novelDetails.genres.map((g, idx) => {
                      const name = typeof g === 'string' ? g : g.name;
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab navigation */}
              <div className="flex items-center gap-6 border-b border-white/5 mb-6">
                <button
                  onClick={() => setDetailsTab('chapters')}
                  className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'chapters' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  Chapters
                  {detailsTab === 'chapters' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
                </button>

                <button
                  onClick={() => setDetailsTab('relations')}
                  className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'relations' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  Related Works
                  {detailsTab === 'relations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
                </button>

                <button
                  onClick={() => setDetailsTab('recommendations')}
                  className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'recommendations' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  More Like This
                  {detailsTab === 'recommendations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
                </button>

                <button
                  onClick={() => setDetailsTab('characters')}
                  className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'characters' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  Characters
                  {detailsTab === 'characters' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
                </button>
              </div>

              {/* Tab Contents */}
              {/* 1. Chapters Tab */}
              {detailsTab === 'chapters' && (
                <div className="space-y-4">
                  {/* Search & Sort Panel */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-transparent border-none p-0">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                      <input
                        type="text"
                        placeholder="Search chapter..."
                        value={chapterFilter}
                        onChange={(e) => setChapterFilter(e.target.value)}
                        className="w-full bg-[#111] text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none transition-all placeholder-zinc-500 font-medium"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                      {/* Server Selector in Details Header */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Source</span>
                        <div className="relative">
                          <button
                            onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                            className="px-3 py-1.5 bg-[#111] hover:bg-zinc-800 text-xs font-medium border border-white/5 rounded-lg flex items-center gap-2 text-zinc-200"
                          >
                            <Server size={12} className="text-red-500" />
                            <span>
                              {readingSource === 'auto'
                                ? (activeServerInfo.name ? `⚡ ${activeServerInfo.name}` : '⚡ Auto (Best Server)')
                                : (NOVEL_SERVERS.find(s => s.id === readingSource)?.name || readingSource)}
                            </span>
                            <ChevronDown size={12} className="text-zinc-500" />
                          </button>

                          {isServerDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsServerDropdownOpen(false)} />
                              <div className="absolute right-0 mt-2 w-48 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 p-1">
                                {NOVEL_SERVERS.map(srv => (
                                  <button
                                    key={srv.id}
                                    onClick={() => {
                                      switchReadingSource(srv.id as any);
                                      setIsServerDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between ${
                                      readingSource === srv.id ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <span>{srv.name}</span>
                                    {readingSource === srv.id && <Check size={12} />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sort Button */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Sort</span>
                        <button
                          onClick={() => setChapterSort(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-medium text-zinc-300 hover:text-white transition-all hover:scale-102 active:scale-98"
                        >
                          {chapterSort === 'asc' ? 'Oldest First' : 'Newest First'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chapters List */}
                  {chaptersLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Loader2 className="animate-spin text-red-500" size={24} />
                      <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                        Streaming chapters from {readingSource === 'auto' ? 'best server' : readingSource}...
                      </span>
                    </div>
                  ) : chaptersError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                      <AlertCircle size={28} className="text-red-500/80 mb-1" />
                      <span className="text-xs font-medium">{chaptersError}</span>
                      <button
                        onClick={() => switchReadingSource(readingSource)}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                      >
                        <RefreshCcw size={11} /> Retry
                      </button>
                    </div>
                  ) : filteredAndSortedChapters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-50 text-center">
                      <AlertCircle size={28} className="text-zinc-600 mb-2" />
                      <span className="text-xs text-zinc-500">No chapters found for this novel.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredAndSortedChapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => handleChapterSelect(ch)}
                          className="p-4 rounded-xl bg-white/[0.02] hover:bg-red-600/[0.04] text-left text-xs transition-all flex items-center justify-between group active:scale-99 border border-white/[0.03] hover:border-red-600/20"
                        >
                          <div className="space-y-1">
                            <span className="text-white font-medium text-sm block group-hover:text-red-500 transition-colors">
                              {ch.title}
                            </span>
                            {ch.date && (
                              <span className="text-zinc-500 text-[10px] block">
                                Released: {ch.date}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-medium text-zinc-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-colors shrink-0">
                            Read
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Relations Tab */}
              {detailsTab === 'relations' && (
                !novelDetails.relations || novelDetails.relations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50">
                    <LayoutList size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">No related works available for this light novel.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {novelDetails.relations.map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => handleNovelSelect({
                          id: rel.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
                          title: rel.title,
                          image: rel.image,
                          author: 'Light Novel'
                        })}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
                      >
                        <img
                          src={rel.image}
                          alt={rel.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-sm shadow">
                            {rel.relationType || 'Related'}
                          </span>
                        </div>
                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {rel.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* 3. Recommendations Tab */}
              {detailsTab === 'recommendations' && (
                !novelDetails.recommendations || novelDetails.recommendations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50">
                    <Sparkles size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">No similar novel recommendations available.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {novelDetails.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => handleNovelSelect({
                          id: rec.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
                          title: rec.title,
                          image: rec.image,
                          author: 'Light Novel'
                        })}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
                      >
                        <img
                          src={rec.image}
                          alt={rec.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {rec.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* 4. Characters Tab */}
              {detailsTab === 'characters' && (
                !novelDetails.characters || novelDetails.characters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50">
                    <Users size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">No character data available for this light novel.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {novelDetails.characters.map((char, idx) => (
                      <div
                        key={idx}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:scale-[1.03] transition-all duration-500"
                      >
                        <img
                          src={char.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=333&color=fff`}
                          alt={char.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${char.role === 'MAIN' ? 'bg-red-600/90 text-white' : 'bg-zinc-800/90 text-zinc-300'} backdrop-blur-sm shadow`}>
                            {char.role === 'MAIN' ? 'Main' : 'Supporting'}
                          </span>
                        </div>
                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {char.name}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN LANDING CATALOG SCREEN (Matches MangaPage 100% Exactly) ─ */}
      {!selectedNovel && (
        <>
          {/* 1. Spotlight Hero Banner */}
          {!searchQuery && trendingNovels[heroIndex] && (
            <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden group mb-10 border-b border-white/5 select-none">
              <div className="absolute inset-0">
                <img
                  src={trendingNovels[heroIndex].bannerImage || trendingNovels[heroIndex].image}
                  alt={trendingNovels[heroIndex].title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-3.5 md:max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
                <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5">
                  <Sparkles size={11} fill="currentColor" /> Spotlight Novel
                </span>

                <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-2xl text-left">
                  {trendingNovels[heroIndex].title}
                </h1>

                <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-gray-300">
                  <span className="text-red-500 font-extrabold flex items-center gap-1 text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">
                    {trendingNovels[heroIndex].status || 'ongoing'}
                  </span>
                  {trendingNovels[heroIndex].year && (
                    <>
                      <span>•</span>
                      <span>{trendingNovels[heroIndex].year} Year</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                    {trendingNovels[heroIndex].contentRating || 'Safe'}
                  </span>
                </div>

                <p className="text-gray-300 text-xs md:text-sm line-clamp-3 max-w-2xl leading-relaxed text-left font-medium drop-shadow-md">
                  {trendingNovels[heroIndex].description}
                </p>

                <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
                  <TvFocusButton
                    onClick={() => handleNovelSelect(trendingNovels[heroIndex])}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                  >
                    <BookOpen size={18} /> Read Now
                  </TvFocusButton>
                </div>
              </div>

              <div className="absolute right-6 bottom-12 z-30 flex flex-col gap-2">
                {[...Array(Math.min(trendingNovels.length, 5))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === i ? 'bg-red-600 h-6' : 'bg-white/30 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. Novel Catalog Header with Server Selector */}
          {searchQuery ? (
            <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-20 animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Search size={18} className="text-red-500" />
                  <span>Search Results for "{searchQuery}"</span>
                </h2>
                <button
                  onClick={() => { if (onSearchClear) onSearchClear(); }}
                  className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <ChevronLeft size={13} /> Back to Catalog
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Searching database...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                  <BookOpen size={48} className="text-white/20 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">No Novels Found</h3>
                  <p className="text-zinc-500 text-xs md:text-sm max-w-sm">No light novels matched your query. Please try searching another title.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {searchResults.map((novel) => (
                    <NovelCard
                      key={novel.id}
                      novel={novel}
                      onNovelSelect={handleNovelSelect}
                      isBookmarked={bookmarks.some(b => b.id === novel.id)}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : feedLoading ? (
            <div className="space-y-12 py-10 px-4 md:px-12 select-none">
              {[...Array(3)].map((_, rIdx) => (
                <div key={rIdx} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse" />
                    <div className="h-5 w-48 bg-zinc-800 rounded-full animate-pulse" />
                  </div>
                  <div className="flex gap-5 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-[140px] sm:w-[170px] shrink-0 aspect-[2/3] bg-zinc-900 border border-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Catalog Section Header & Automatic Best Server Selector */}
              <div className="flex items-center justify-between px-4 md:px-12 py-4 border-b border-white/5 mb-6 select-none">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5 text-left">
                    <span className="w-2.5 h-6 rounded-full bg-red-600" />
                    Novel Catalog
                  </h2>
                </div>

                {/* Server Selector Dropdown */}
                <div className="relative group shrink-0">
                  <button
                    onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                    className="flex items-center gap-2.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-xs font-bold text-gray-200 transition-all active:scale-95 min-w-[170px] justify-between shadow-lg backdrop-blur-md"
                  >
                    <div className="flex items-center gap-2">
                      <Server size={14} className="text-red-500" />
                      <span>
                        {readingSource === 'auto'
                          ? (activeServerInfo.name ? `⚡ ${activeServerInfo.name}` : '⚡ Auto (Best Server)')
                          : (NOVEL_SERVERS.find(s => s.id === readingSource)?.name || readingSource)}
                      </span>
                    </div>
                    <ChevronDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </button>

                  {isServerDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsServerDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all origin-top-right z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {NOVEL_SERVERS.map(srv => (
                          <button
                            key={srv.id}
                            onClick={() => {
                              switchReadingSource(srv.id as any);
                              setIsServerDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-between ${
                              readingSource === srv.id
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>{srv.name}</span>
                            {readingSource === srv.id && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Horizontal Category Rails */}
              {bookmarks.length > 0 && (
                <NovelRow
                  title="Your Bookmarked Light Novels"
                  novels={bookmarks}
                  onNovelSelect={handleNovelSelect}
                  onExpand={() => setExpandedCategory({ title: "Your Bookmarked Light Novels", items: bookmarks })}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                />
              )}

              <NovelRow
                title="Trending Light Novels"
                novels={trendingNovels}
                onNovelSelect={handleNovelSelect}
                onExpand={() => setExpandedCategory({ title: "Trending Light Novels", items: trendingNovels })}
                bookmarks={bookmarks}
                onToggleBookmark={toggleBookmark}
              />

              <NovelRow
                title="Most Popular Favorites"
                novels={popularNovels}
                onNovelSelect={handleNovelSelect}
                onExpand={() => setExpandedCategory({ title: "Most Popular Favorites", items: popularNovels })}
                bookmarks={bookmarks}
                onToggleBookmark={toggleBookmark}
              />

              <NovelRow
                title="Top Rated of All Time"
                novels={topRatedNovels}
                onNovelSelect={handleNovelSelect}
                onExpand={() => setExpandedCategory({ title: "Top Rated of All Time", items: topRatedNovels })}
                bookmarks={bookmarks}
                onToggleBookmark={toggleBookmark}
              />

              {genreRows.map(row => (
                <NovelRow
                  key={row.title}
                  title={row.title}
                  novels={row.novels}
                  onNovelSelect={handleNovelSelect}
                  onExpand={() => setExpandedCategory({ title: row.title, items: row.novels })}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Expanded Category Modal */}
      {expandedCategory && (
        <ExpandedCategoryModal
          isOpen={!!expandedCategory}
          onClose={() => setExpandedCategory(null)}
          title={expandedCategory.title}
          mode="manga"
          initialItems={expandedCategory.items}
          onItemClick={(item) => {
            setExpandedCategory(null);
            handleNovelSelect(item);
          }}
          renderItem={(item) => (
            <NovelCard
              key={item.id}
              novel={item}
              onNovelSelect={(n) => {
                setExpandedCategory(null);
                handleNovelSelect(n);
              }}
              isBookmarked={bookmarks.some(b => b.id === item.id)}
              onToggleBookmark={toggleBookmark}
            />
          )}
        />
      )}

      {/* Immersive Reader Modal */}
      {selectedNovel && activeChapter && (
        <div
          ref={readerContainerRef}
          className="fixed inset-0 z-[200] overflow-hidden flex flex-col select-text transition-all duration-300"
          style={{ backgroundColor: getThemeStyles().bg, color: getThemeStyles().text }}
        >
          {/* Reader Top Navbar */}
          <div
            className={`fixed top-0 left-0 right-0 h-14 z-[210] px-4 flex items-center justify-between border-b transition-all duration-300 ${
              controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
            } ${getThemeStyles().border} ${getThemeStyles().headerBg}`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedNovel) {
                    window.history.pushState(null, '', `/novel/${selectedNovel.id}`);
                  }
                  setActiveChapter(null);
                  setChapterContent(null);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-black/10 dark:bg-white/5 transition-colors"
                title="Back to Novel Details"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl font-bold max-w-[160px] truncate">
                <BookOpen size={14} className="text-red-500 shrink-0" />
                <span className="truncate text-[11px]">{selectedNovel.title}</span>
              </div>
            </div>

            {/* Chapter Title & TOC Dropdown */}
            <div className="relative z-[220]">
              <button
                onClick={() => { setShowTOCDrawer(!showTOCDrawer); setShowSettingsDrawer(false); }}
                className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 rounded-xl font-semibold text-xs transition-all max-w-[180px] sm:max-w-[280px]"
              >
                <span className="truncate">{activeChapter.title}</span>
                <ChevronDown size={12} className="opacity-60 shrink-0" />
              </button>

              {showTOCDrawer && (
                <>
                  <div onClick={() => setShowTOCDrawer(false)} className="fixed inset-0 z-0 bg-transparent" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-9 w-64 max-h-64 overflow-y-auto p-1 rounded-2xl shadow-2xl border flex flex-col gap-0.5 z-10 bg-[#1c1c1f] border-zinc-800 text-white animate-in fade-in slide-in-from-top-2">
                    {novelDetails?.chapters.map((c) => {
                      const isCurrent = c.id === activeChapter.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { handleChapterSelect(c); setShowTOCDrawer(false); }}
                          className={`w-full text-left p-2.5 text-[11px] rounded-lg transition-all flex items-center justify-between ${
                            isCurrent ? 'bg-red-600 text-white font-bold' : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <span className="truncate">{c.title}</span>
                          {isCurrent && <Check size={12} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevChapter}
                disabled={activeChapterIndex <= 0}
                className="hidden md:flex items-center gap-1 py-1.5 px-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 disabled:opacity-20 text-xs font-semibold rounded-xl"
              >
                <ChevronLeft size={14} /> PREV
              </button>

              <button
                onClick={handleNextChapter}
                disabled={activeChapterIndex >= (novelDetails?.chapters.length || 0) - 1}
                className="hidden md:flex items-center gap-1 py-1.5 px-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 disabled:opacity-20 text-xs font-semibold rounded-xl"
              >
                NEXT <ChevronRight size={14} />
              </button>

              <button
                onClick={() => setShowSettingsDrawer(true)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-colors"
                title="Settings"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettingsDrawer && (
            <div className="fixed inset-0 z-[250] flex justify-end">
              <div onClick={() => setShowSettingsDrawer(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" />
              <div className="relative w-[380px] max-w-[95%] h-full flex flex-col z-10 shadow-2xl bg-[#09090b]/98 border-l border-white/10 text-white overflow-y-auto animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="sticky top-0 z-20 bg-[#09090b]/90 backdrop-blur-md px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
                      <Settings size={16} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white tracking-wide uppercase">Reader Customizer</h3>
                      <p className="text-[10px] text-zinc-400 font-medium">Fine-tune typography & theme</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettingsDrawer(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5 active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 space-y-6">

                  {/* ── LIVE SAMPLE PREVIEW BOX ──────────────────────── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-red-500" /> Live Sample Preview
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">{fontSize}px • {theme.toUpperCase()}</span>
                    </div>

                    <div
                      className="w-full p-4 rounded-2xl border shadow-inner transition-all duration-300 relative overflow-hidden"
                      style={{
                        backgroundColor: getThemeStyles().bg,
                        color: getThemeStyles().text,
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        fontFamily: fontFamily,
                        fontSize: `${Math.min(fontSize, 20)}px`,
                        lineHeight: lineHeight,
                        textAlign: textAlign,
                      }}
                    >
                      <p className="font-bold text-xs mb-1.5 opacity-90 border-b pb-1 border-current/10">
                        Sample Chapter Preview
                      </p>
                      <p className="opacity-85 text-xs leading-relaxed">
                        "The world isn't fair, but that's what makes it interesting. Everyone is equal at birth, but then differences appear..."
                      </p>
                    </div>
                  </div>

                  {/* ── 1. THEME SELECTION ────────────────────────────── */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Color Theme</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { name: 'Light', id: 'light', bg: '#fafafa', text: '#27272a' },
                        { name: 'Sepia', id: 'sepia', bg: '#f7f1e3', text: '#433422' },
                        { name: 'Paper', id: 'paper', bg: '#f4ebd0', text: '#5c4322' },
                        { name: 'Grey', id: 'grey', bg: '#27272a', text: '#f4f4f5' },
                        { name: 'AMOLED', id: 'amoled', bg: '#000000', text: '#e4e4e7' }
                      ].map((item) => {
                        const isActive = theme === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setTheme(item.id as any);
                              localStorage.setItem('novel_theme', item.id);
                            }}
                            className={`relative flex flex-col items-center justify-between p-2 rounded-2xl border transition-all duration-200 ${
                              isActive
                                ? 'border-red-500 ring-2 ring-red-500/50 scale-105 shadow-lg shadow-red-500/20'
                                : 'border-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: item.bg, color: item.text }}
                          >
                            <span className="font-black text-xs">Aa</span>
                            <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-full">{item.name}</span>
                            {isActive && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] shadow">
                                <Check size={10} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 2. FONT FAMILY SELECTION ──────────────────────── */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Typography Font</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      {[
                        { label: 'Serif (Lora)', value: 'Lora, Georgia, serif', sample: 'Aa' },
                        { label: 'Sans (Inter)', value: 'Inter, system-ui, sans-serif', sample: 'Aa' },
                        { label: 'Mono (Fira)', value: 'Fira Code, monospace', sample: 'Aa' },
                        { label: 'Georgia', value: 'Georgia, Cambria, serif', sample: 'Aa' },
                        { label: 'Merriweather', value: 'Merriweather, Georgia, serif', sample: 'Aa' },
                        { label: 'OpenDyslexic', value: 'OpenDyslexic, sans-serif', sample: 'Aa' }
                      ].map((font) => {
                        const isActive = fontFamily === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => {
                              setFontFamily(font.value);
                              localStorage.setItem('novel_font_family', font.value);
                            }}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
                              isActive
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 font-bold scale-[1.02]'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                            style={{ fontFamily: font.value }}
                          >
                            <span className="text-sm">{font.sample}</span>
                            <span className="text-[10px] truncate max-w-full">{font.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 3. FONT SIZE SLIDER & CONTROLS ────────────────── */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Font Size</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 font-mono text-xs font-bold">
                        {fontSize}px
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2">
                      <button
                        onClick={() => {
                          const next = Math.max(12, fontSize - 1);
                          setFontSize(next);
                          localStorage.setItem('novel_font_size', next.toString());
                        }}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl font-bold text-xs text-zinc-300 hover:text-white transition-all"
                      >
                        A-
                      </button>

                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={fontSize}
                        onChange={(e) => {
                          const next = parseInt(e.target.value);
                          setFontSize(next);
                          localStorage.setItem('novel_font_size', next.toString());
                        }}
                        className="flex-1 accent-red-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                      />

                      <button
                        onClick={() => {
                          const next = Math.min(32, fontSize + 1);
                          setFontSize(next);
                          localStorage.setItem('novel_font_size', next.toString());
                        }}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl font-bold text-xs text-zinc-300 hover:text-white transition-all"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* ── 4. LINE HEIGHT & SPACING ─────────────────────── */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Line Spacing</span>
                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      {[
                        { label: 'Compact', val: 1.5 },
                        { label: 'Normal', val: 1.8 },
                        { label: 'Relaxed', val: 2.1 }
                      ].map((lh) => {
                        const isActive = lineHeight === lh.val;
                        return (
                          <button
                            key={lh.val}
                            onClick={() => {
                              setLineHeight(lh.val);
                              localStorage.setItem('novel_line_height', lh.val.toString());
                            }}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {lh.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 5. TEXT ALIGNMENT ────────────────────────────── */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Text Alignment</span>
                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'justify', label: 'Justify', icon: Type },
                        { id: 'center', label: 'Center', icon: List }
                      ].map((align) => {
                        const Icon = align.icon;
                        const isActive = textAlign === align.id;
                        return (
                          <button
                            key={align.id}
                            onClick={() => setTextAlign(align.id as any)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isActive
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Icon size={14} />
                            <span>{align.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 6. READER CONTAINER WIDTH ─────────────────────── */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Page Margin Width</span>
                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      {[
                        { id: 'narrow', label: 'Narrow' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'wide', label: 'Wide' }
                      ].map((w) => {
                        const isActive = readerWidth === w.id;
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              setReaderWidth(w.id as any);
                              localStorage.setItem('novel_reader_width', w.id);
                            }}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset Defaults Button */}
                  <button
                    onClick={() => {
                      setFontSize(18);
                      setFontFamily('Lora, Georgia, serif');
                      setTheme('grey');
                      setLineHeight(1.8);
                      setTextAlign('justify');
                      setReaderWidth('medium');
                      localStorage.setItem('novel_font_size', '18');
                      localStorage.setItem('novel_font_family', 'Lora, Georgia, serif');
                      localStorage.setItem('novel_theme', 'grey');
                      localStorage.setItem('novel_line_height', '1.8');
                      localStorage.setItem('novel_reader_width', 'medium');
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <RefreshCcw size={13} /> Reset to Defaults
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* Reader Main Content */}
          <div ref={readerScrollContainerRef} className="flex-1 w-full flex justify-center relative overflow-y-auto pt-20 pb-20 px-4">
            <div
              className="relative w-full flex flex-col items-center justify-start"
              style={{ maxWidth: readerWidth === 'narrow' ? '580px' : readerWidth === 'wide' ? '1050px' : '800px' }}
            >
              <div
                ref={readerBodyRef}
                className="w-full select-text transition-all duration-300"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  lineHeight: lineHeight,
                  padding: '0 16px',
                }}
              >
                {chapterLoading ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-3">
                    <Loader2 className="animate-spin text-red-600" size={32} />
                    <p className="text-xs text-zinc-500">Streaming novel text lines...</p>
                  </div>
                ) : chapterContent ? (
                  <div className="pr-1">
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-8 border-b pb-4 opacity-90 border-black/5 dark:border-white/5">
                      {chapterContent.title}
                    </h2>
                    {chapterContent.paragraphs.map((p, idx) => {
                      const isBeingRead = ttsCurrentParagraphIndex === idx;
                      return (
                        <p
                          key={idx}
                          id={`novel-p-${idx}`}
                          onClick={() => {
                            if (showTTSBar) {
                              readParagraph(idx, chapterContent.paragraphs);
                            }
                          }}
                          className={`novel-p transition-all duration-300 ${
                            isBeingRead
                              ? 'bg-red-500/15 border-l-4 border-red-500 pl-3 py-1 rounded-r-xl font-medium shadow-md text-red-400 scale-[1.01]'
                              : 'opacity-95 hover:opacity-100'
                          } ${showTTSBar ? 'cursor-pointer hover:bg-white/5 rounded-lg' : ''}`}
                          style={{
                            textIndent: isBeingRead ? '0' : '1.5rem',
                            marginBottom: paragraphSpacing === 'compact' ? '0.4rem' : paragraphSpacing === 'loose' ? '1.4rem' : '0.8rem'
                          }}
                        >
                          {p}
                        </p>
                      );
                    })}

                    <div className="flex items-center justify-between gap-4 mt-12 pt-8 border-t border-black/5 dark:border-white/5 pb-16">
                      <button
                        onClick={handlePrevChapter}
                        disabled={activeChapterIndex <= 0}
                        className="bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 py-2 px-6 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold disabled:opacity-30"
                      >
                        <ChevronLeft size={16} /> Previous Chapter
                      </button>

                      <button
                        onClick={handleNextChapter}
                        disabled={activeChapterIndex >= (novelDetails?.chapters.length || 0) - 1}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold shadow-lg shadow-red-600/25 active:scale-95 disabled:opacity-30"
                      >
                        Next Chapter <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── FLOATING TEXT-TO-SPEECH (TTS) AUDIO CONTROLLER DECK ────────────────── */}
          {showTTSBar && isTTSSupported && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-xl bg-[#141416]/95 backdrop-blur-xl border border-white/15 text-white rounded-3xl shadow-2xl p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-col gap-2.5">
                
                {/* Top Title Bar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 shrink-0">
                      <Headphones size={15} className={isTTSPlaying && !isTTSPaused ? 'animate-pulse' : ''} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-zinc-300 truncate">
                        {activeChapter?.title || 'Novel Reader TTS'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {ttsCurrentParagraphIndex >= 0 && chapterContent
                          ? `Paragraph ${ttsCurrentParagraphIndex + 1} / ${chapterContent.paragraphs.length}`
                          : 'Ready to listen'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Speed Selector */}
                    <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-xl border border-white/10">
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setTTSRate(rate);
                            if (isTTSPlaying && ttsCurrentParagraphIndex >= 0 && chapterContent) {
                              readParagraph(ttsCurrentParagraphIndex, chapterContent.paragraphs);
                            }
                          }}
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-lg transition-all ${
                            ttsRate === rate ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        stopTTS();
                        setShowTTSBar(false);
                      }}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Close TTS"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                  
                  {/* Voice Selector */}
                  {availableVoices.length > 0 && (
                    <div className="relative flex-1 min-w-[120px] max-w-[180px]">
                      <select
                        value={selectedVoiceURI}
                        onChange={(e) => setSelectedVoiceURI(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white text-[10px] font-medium rounded-xl py-1.5 px-2.5 outline-none cursor-pointer hover:bg-white/10 transition-all truncate"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI} className="bg-zinc-900 text-white">
                            {v.name.replace(/Google|Microsoft|Apple/g, '').trim()} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2">
                    {/* Skip Prev Paragraph */}
                    <button
                      onClick={() => {
                        if (chapterContent && ttsCurrentParagraphIndex > 0) {
                          const nextIdx = ttsCurrentParagraphIndex - 1;
                          readParagraph(nextIdx, chapterContent.paragraphs);
                        }
                      }}
                      disabled={!chapterContent || ttsCurrentParagraphIndex <= 0}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition-all active:scale-95"
                      title="Previous Paragraph"
                    >
                      <SkipBack size={14} />
                    </button>

                    {/* Main Play/Pause Button */}
                    <button
                      onClick={toggleTTSPlayPause}
                      className="p-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center"
                      title={isTTSPlaying && !isTTSPaused ? 'Pause Reading' : 'Play Reading'}
                    >
                      {isTTSPlaying && !isTTSPaused ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                    </button>

                    {/* Skip Next Paragraph */}
                    <button
                      onClick={() => {
                        if (chapterContent && ttsCurrentParagraphIndex < chapterContent.paragraphs.length - 1) {
                          const nextIdx = ttsCurrentParagraphIndex + 1;
                          readParagraph(nextIdx, chapterContent.paragraphs);
                        }
                      }}
                      disabled={!chapterContent || ttsCurrentParagraphIndex >= chapterContent.paragraphs.length - 1}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition-all active:scale-95"
                      title="Next Paragraph"
                    >
                      <SkipForward size={14} />
                    </button>
                  </div>

                  {/* Stop Button */}
                  <button
                    onClick={stopTTS}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-600/20 hover:text-red-400 border border-white/10 text-[10px] font-bold text-zinc-400 transition-all"
                  >
                    Stop
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
