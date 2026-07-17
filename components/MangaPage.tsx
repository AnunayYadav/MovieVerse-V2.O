import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Info, Search, Star, BookOpen, X, ChevronLeft, ChevronRight, FileText, LayoutList, RefreshCcw, Loader2, AlertCircle, Sparkles, Trophy, Calendar, TrendingUp, ArrowLeft, Users, Globe, Bookmark, AlertTriangle, Settings, Heart, Maximize, Minimize, Languages, ChevronDown, Check, Send } from 'lucide-react';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';
import { fetchAniListUserList } from '../services/anilistSync';

export interface MangaDexManga {
  id: string;
  attributes: {
    title: {
      en?: string;
      [key: string]: string | undefined;
    };
    altTitles?: {
      [key: string]: string | undefined;
    }[];
    description: {
      en?: string;
      [key: string]: string | undefined;
    };
    status: string;
    year: number | null;
    contentRating: string;
    publicationDemographic?: string;
    relevance?: number;
    tags?: {
      id: string;
      attributes: {
        name: {
          en: string;
        };
        group: string;
      };
    }[];
    links?: Record<string, string | undefined>;
    originalLanguage?: string;
  };
  relationships: any[];
}

interface MangaDexChapter {
  id: string;
  attributes: {
    title: string | null;
    chapter: string | null;
    pages: number;
    publishAt: string;
  };
}

interface MangaPageProps {
  apiKey: string;
  selectedMangaId: string | null;
  onMangaSelect: (id: string | null) => void;
  activeChapterId: string | null;
  onChapterSelect: (id: string | null) => void;
  onMovieClick: (m: any) => void; // Unused but kept to match props shape of other tabs
  searchQuery?: string;
  onSearchClear?: () => void;
  isAiSearchActive?: boolean;
  onCloseDetails?: () => void;
  disableEntryAnimation?: boolean;
  profile?: any;
}

const MANGA_GENRES = [
  { name: "Action", id: "391b0423-d847-456f-aff0-8b0cfc03066b" },
  { name: "Adventure", id: "87cc87cd-a395-47af-b27a-93258283bbc6" },
  { name: "Comedy", id: "4d32cc48-9f00-4cca-9b5a-a839f0764984" },
  { name: "Drama", id: "b9af3a63-f058-46de-a9a0-e0c13906197a" },
  { name: "Fantasy", id: "cdc58593-87dd-415e-bbc0-2ec27bf404cc" },
  { name: "Romance", id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d" },
  { name: "Sci-Fi", id: "256c8bd9-4904-4360-bf4f-508a76d67183" },
  { name: "Supernatural", id: "eabc5b4c-6aff-42f3-b657-3e90cbd00b75" },
  { name: "Thriller", id: "07251805-a27e-4d59-b488-f0bfbec15168" },
  { name: "Mystery", id: "ee968100-4191-4968-93d3-f82d72be7e46" },
  { name: "Slice of Life", id: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9" },
  { name: "Psychological", id: "3b60b75c-a2d7-4860-ab56-05f391bb889c" }
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English (EN)',
  es: 'Spanish (ES)',
  'es-la': 'Spanish LatAm (ES-LA)',
  fr: 'French (FR)',
  ja: 'Japanese (JA)',
  'pt-br': 'Portuguese Br (PT-BR)',
  ru: 'Russian (RU)',
  de: 'German (DE)',
  it: 'Italian (IT)',
  zh: 'Chinese (ZH)',
  ko: 'Korean (KO)',
  id: 'Indonesian (ID)',
  vi: 'Vietnamese (VI)'
};

const RELATION_NAMES: Record<string, string> = {
  prequel: 'Prequel',
  sequel: 'Sequel',
  spin_off: 'Spin-off',
  side_story: 'Side Story',
  adapted_from: 'Adapted From',
  alternative_version: 'Alternative Version',
  alternative_setting: 'Alternative Setting',
  doujinshi: 'Doujinshi',
  colored: 'Colored Version',
  same_franchise: 'Same Franchise',
  shared_universe: 'Shared Universe',
  monologue: 'Monologue',
  main_story: 'Main Story'
};

export const getMangaTitleHelper = (manga: MangaDexManga, lang: 'english' | 'romaji' | 'native') => {
  if (!manga.attributes) return "Untitled Manga";
  const titleObj = manga.attributes.title || {};
  const altTitles = manga.attributes.altTitles || [];

  const findAltTitle = (l: string) => {
    const found = altTitles.find(t => t[l] !== undefined);
    return found ? found[l] : null;
  };

  if (lang === 'english') {
    return titleObj.en || findAltTitle('en') || titleObj['ja-ro'] || findAltTitle('ja-ro') || Object.values(titleObj)[0] || "Untitled Manga";
  } else if (lang === 'romaji') {
    return titleObj['ja-ro'] || findAltTitle('ja-ro') || titleObj.en || findAltTitle('en') || Object.values(titleObj)[0] || "Untitled Manga";
  } else {
    // Native (usually ja, ko, zh)
  }
};

export const translateAniListToManga = (aniMedia: any): MangaDexManga => {
  return {
    id: `anilist-${aniMedia.id}`,
    attributes: {
      title: {
        en: aniMedia.title?.english || aniMedia.title?.romaji || aniMedia.title?.native || "Untitled Manga",
        'ja-ro': aniMedia.title?.romaji
      },
      description: {
        en: aniMedia.description || ""
      },
      status: aniMedia.status?.toLowerCase() || "ongoing",
      year: aniMedia.startDate?.year || null,
      contentRating: "safe",
      tags: aniMedia.genres?.map((g: string) => ({
        id: g,
        attributes: { name: { en: g } }
      })) || []
    },
    relationships: [
      {
        type: "cover_art",
        attributes: {
          fileName: aniMedia.coverImage?.large || ""
        }
      }
    ],
    // Custom markers to recognize it's AniList
    isAniList: true,
    aniListId: aniMedia.id
  } as any;
};

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; triggerLabel?: string }[];
  icon?: React.ReactNode;
  className?: string;
  dropdownClassName?: string;
  menuAlign?: 'left' | 'right' | 'center';
  maxHeight?: string;
  containerClassName?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  icon,
  className = '',
  dropdownClassName = '',
  menuAlign = 'left',
  maxHeight = 'max-h-60',
  containerClassName = 'w-full'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeOptionRef.current) {
      activeOptionRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const displayLabel = selectedOption?.triggerLabel || selectedOption?.label || '';

  const alignmentClass =
    menuAlign === 'right' ? 'right-0 origin-top-right' :
      menuAlign === 'center' ? 'left-1/2 -translate-x-1/2 origin-top' :
        'left-0 origin-top-left';

  return (
    <div className={`relative inline-block text-left ${containerClassName}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-white bg-white/5 border border-white/5 hover:bg-white/10 focus:border-red-600 rounded-lg transition-all focus:outline-none cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} shrink-0`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[150] mt-1.5 w-full min-w-[180px] bg-[#0c0c0e]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${alignmentClass} ${dropdownClassName}`}>
          <div className={`overflow-y-auto pr-1.5 custom-scrollbar ${maxHeight}`}>
            {options.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-zinc-500 font-medium">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    ref={isSelected ? activeOptionRef : null}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 flex items-center justify-between cursor-pointer ${isSelected
                        ? 'bg-red-600 text-white font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className="truncate mr-2">{opt.label}</span>
                    {isSelected && <Check size={12} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GigaViewerPage: React.FC<{ page: any; pageNum: number; className?: string }> = ({ page, pageNum, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!page || !page.src) return;
    let isMounted = true;
    const img = new Image();
    img.src = `/api/manga?action=proxy-gigaviewer-image&url=${encodeURIComponent(page.src)}`;
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const width = page.width || img.width;
      const height = page.height || img.height;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const div = 4;
      const mul = 8;
      const fixedWidth = Math.floor(width / (div * mul)) * mul;
      const fixedHeight = Math.floor(height / (div * mul)) * mul;

      ctx.drawImage(img, 0, 0);

      for (let col = 0; col < div; col++) {
        for (let row = 0; row < div; row++) {
          ctx.drawImage(
            img,
            fixedWidth * col, fixedHeight * row, fixedWidth, fixedHeight,
            fixedWidth * row, fixedHeight * col, fixedWidth, fixedHeight
          );
        }
      }
      setLoading(false);
    };

    img.onerror = () => {
      if (isMounted) setError(true);
    };

    return () => {
      isMounted = false;
    };
  }, [page]);

  if (error) {
    return (
      <div className="w-full aspect-[2/3] bg-zinc-900 flex items-center justify-center border border-white/5 rounded-xl font-sans">
        <span className="text-zinc-500 text-xs">Failed to load page {pageNum}</span>
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden bg-transparent flex justify-center font-sans">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-955/20 min-h-[300px]">
          <Loader2 className="animate-spin text-red-600" size={24} />
        </div>
      )}
      <canvas ref={canvasRef} className={className || "w-full h-auto block max-w-full"} style={{ display: loading ? 'none' : 'block' }} />
    </div>
  );
};


export const MangaPage: React.FC<MangaPageProps> = ({
  apiKey,
  selectedMangaId,
  onMangaSelect,
  activeChapterId,
  onChapterSelect,
  searchQuery: parentSearchQuery,
  onSearchClear,
  isAiSearchActive,
  onCloseDetails,
  disableEntryAnimation,
  profile
}) => {
  const [trending, setTrending] = useState<MangaDexManga[]>([]);
  const [latest, setLatest] = useState<MangaDexManga[]>([]);
  const [popular, setPopular] = useState<MangaDexManga[]>([]);
  const [topRated, setTopRated] = useState<MangaDexManga[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: MangaDexManga[] } | null>(null);

  // Personalization States
  const [anilistPlanning, setAnilistPlanning] = useState<MangaDexManga[]>([]);
  const [malPlanning, setMalPlanning] = useState<MangaDexManga[]>([]);
  const [missedMangaSequels, setMissedMangaSequels] = useState<MangaDexManga[]>([]);

  // Character Details Modal States
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [characterDetails, setCharacterDetails] = useState<any | null>(null);
  const [characterDetailsLoading, setCharacterDetailsLoading] = useState(false);
  const [characterDetailsError, setCharacterDetailsError] = useState<string | null>(null);
  const [isCharacterModalClosing, setIsCharacterModalClosing] = useState(false);
  const [characterModalMediaManga, setCharacterModalMediaManga] = useState<MangaDexManga[]>([]);
  const [characterModalMediaLoading, setCharacterModalMediaLoading] = useState(false);

  // Staff Details States
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffDetails, setStaffDetails] = useState<any | null>(null);
  const [staffDetailsLoading, setStaffDetailsLoading] = useState(false);
  const [staffDetailsError, setStaffDetailsError] = useState<string | null>(null);
  const [staffMedia, setStaffMedia] = useState<MangaDexManga[]>([]);
  const [staffMediaLoading, setStaffMediaLoading] = useState(false);

  // Studio Details States
  const [selectedStudioId, setSelectedStudioId] = useState<number | null>(null);
  const [studioDetails, setStudioDetails] = useState<any | null>(null);
  const [studioDetailsLoading, setStudioDetailsLoading] = useState(false);
  const [studioDetailsError, setStudioDetailsError] = useState<string | null>(null);
  const [studioMedia, setStudioMedia] = useState<MangaDexManga[]>([]);
  const [studioMediaLoading, setStudioMediaLoading] = useState(false);

  // Reviews States
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // AniList Media Details
  const [aniListMangaData, setAniListMangaData] = useState<any | null>(null);
  const [aniListMangaLoading, setAniListMangaLoading] = useState(false);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(false);
  const lastScrollTopRef = useRef(0);

  // Endless scroll genre rows
  const [genreRows, setGenreRows] = useState<{ genre: string; media: MangaDexManga[] }[]>([]);
  const [loadingGenreRows, setLoadingGenreRows] = useState(false);
  const currentGenreIndexRef = useRef(0);

  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MangaDexManga[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Title Language settings
  const [titleLanguage, setTitleLanguage] = useState<'english' | 'romaji' | 'native'>('english');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [includeNsfw, setIncludeNsfw] = useState(false);

  const getMangaTitle = useCallback((manga: MangaDexManga) => {
    return getMangaTitleHelper(manga, titleLanguage);
  }, [titleLanguage]);

  // Details screen
  const [selectedManga, setSelectedManga] = useState<MangaDexManga | null>(null);
  const [chapters, setChapters] = useState<MangaDexChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'chapters' | 'relations' | 'recommendations' | 'characters' | 'staff' | 'reviews' | 'social'>('chapters');
  const [characters, setCharacters] = useState<any[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState('');
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc'>('desc');

  // Resolve AniList ID and load social tab details for Manga
  const [aniListMangaId, setAniListMangaId] = useState<number | null>(null);
  const [socialActivities, setSocialActivities] = useState<any[]>([]);
  const [socialActivitiesLoading, setSocialActivitiesLoading] = useState(false);
  const [socialRecommendations, setSocialRecommendations] = useState<any[]>([]);
  const [socialRecommendationsLoading, setSocialRecommendationsLoading] = useState(false);
  const [socialPostText, setSocialPostText] = useState("");

  // Load personalized AniList manga watchlist and missed sequels
  useEffect(() => {
    if (!profile?.anilistUsername) {
      setAnilistPlanning([]);
      setMissedMangaSequels([]);
      return;
    }

    const loadPersonalizedManga = async () => {
      try {
        const userEntries = await fetchAniListUserList(profile.anilistUsername, 'MANGA');

        // 1. Planning list
        const planningList = userEntries
          .filter(e => e.status === 'PLANNING')
          .map(e => translateAniListToManga(e.media));
        setAnilistPlanning(planningList);

        // 2. Missed sequels
        const completedList = userEntries.filter(e => e.status === 'COMPLETED');
        const completedIds = new Set(completedList.map(e => e.media.id));
        const plannedOrWatchingIds = new Set(
          userEntries.filter(e => e.status === 'PLANNING' || e.status === 'CURRENT').map(e => e.media.id)
        );

        const missed: MangaDexManga[] = [];
        const seenIds = new Set<number>();

        for (const entry of completedList.slice(0, 10)) {
          const relationQuery = `
            query ($id: Int) {
              Media(id: $id) {
                relations {
                  edges {
                    relationType
                    node {
                      id
                      title {
                        romaji
                        english
                        native
                        userPreferred
                      }
                      coverImage {
                        extraLarge
                        large
                        medium
                        color
                      }
                      format
                      chapters
                      averageScore
                      bannerImage
                      popularity
                      genres
                    }
                  }
                }
              }
            }
          `;
          try {
            const res = await window.fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: relationQuery, variables: { id: entry.media.id } })
            });
            const json = await res.json();
            const edges = json.data?.Media?.relations?.edges || [];
            for (const edge of edges) {
              if (edge.relationType === 'SEQUEL' || edge.relationType === 'ALTERNATIVE') {
                const sequelMedia = edge.node;
                if (sequelMedia && !completedIds.has(sequelMedia.id) && !plannedOrWatchingIds.has(sequelMedia.id)) {
                  if (!seenIds.has(sequelMedia.id)) {
                    seenIds.add(sequelMedia.id);
                    missed.push(translateAniListToManga(sequelMedia));
                  }
                }
              }
            }
          } catch (_) { }
        }
        setMissedMangaSequels(missed);
      } catch (error) {
        console.error("Failed to load AniList personalized manga:", error);
      }
    };

    loadPersonalizedManga();
  }, [profile?.anilistUsername]);

  // Load MyAnimeList Manga Watchlist via Jikan API
  useEffect(() => {
    if (!profile?.malUsername) {
      setMalPlanning([]);
      return;
    }

    const fetchMalManga = async () => {
      try {
        const res = await window.fetch(`https://api.jikan.moe/v4/users/${profile.malUsername}/mangalist?status=plan_to_read`);
        const json = await res.json();
        const malItems = json.data || [];

        const mapped: MangaDexManga[] = malItems.map((item: any) => {
          const manga = item.manga;
          return {
            id: `mal-manga-${manga.mal_id}`,
            attributes: {
              title: {
                en: manga.title,
                'ja-ro': manga.title
              },
              description: {
                en: manga.synopsis || ""
              },
              status: manga.status?.toLowerCase() || "ongoing",
              year: manga.publishing ? manga.published?.prop?.from?.year : null,
              contentRating: "safe",
              tags: manga.genres?.map((g: any) => ({
                id: g.name,
                attributes: { name: { en: g.name } }
              })) || []
            },
            relationships: [
              {
                type: "cover_art",
                attributes: {
                  fileName: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || ""
                }
              }
            ],
            isMAL: true,
            malId: manga.mal_id
          } as any;
        });
        setMalPlanning(mapped);
      } catch (error) {
        console.error("Failed to load MyAnimeList manga watchlist:", error);
      }
    };

    const timer = setTimeout(fetchMalManga, 1500);
    return () => clearTimeout(timer);
  }, [profile?.malUsername]);

  useEffect(() => {
    if (!selectedManga) {
      setAniListMangaId(null);
      return;
    }

    const title = getMangaTitle(selectedManga);
    if (!title) return;

    const resolveAniListManga = async () => {
      try {
        const cached = localStorage.getItem(`movieverse_anilist_manga_map_${selectedManga.id}`);
        if (cached) {
          setAniListMangaId(parseInt(cached, 10));
          return;
        }

        const q = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              id
            }
          }
        `;
        const res = await fetch('/api/anilist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query: q, variables: { search: title } })
        });
        const json = await res.json();
        const id = json.data?.Media?.id;
        if (id) {
          setAniListMangaId(id);
          localStorage.setItem(`movieverse_anilist_manga_map_${selectedManga.id}`, id.toString());
        }
      } catch (e) {
        console.error("Failed to map MangaDex to AniList ID", e);
      }
    };

    resolveAniListManga();
  }, [selectedManga]);

  // Load activities and recommendations for Manga when the social tab is selected
  useEffect(() => {
    if (detailsTab === 'social' && aniListMangaId) {
      const fetchActivities = async () => {
        setSocialActivitiesLoading(true);
        try {
          const q = `
            query ($mediaId: Int) {
              Page(page: 1, perPage: 15) {
                activities(mediaId: $mediaId, sort: ID_DESC) {
                  ... on ListActivity {
                    id
                    userId
                    type
                    status
                    progress
                    replyCount
                    likeCount
                    createdAt
                    user {
                      name
                      avatar { large }
                    }
                  }
                  ... on TextActivity {
                    id
                    userId
                    type
                    text
                    replyCount
                    likeCount
                    createdAt
                    user {
                      name
                      avatar { large }
                    }
                  }
                }
              }
            }
          `;
          const res = await fetch('/api/anilist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: q, variables: { mediaId: aniListMangaId } })
          });
          const json = await res.json();
          setSocialActivities(json.data?.Page?.activities || []);
        } catch (e) {
          console.error("Failed to fetch Manga activities:", e);
        } finally {
          setSocialActivitiesLoading(false);
        }
      };

      const fetchRecommendations = async () => {
        setSocialRecommendationsLoading(true);
        try {
          const q = `
            query ($mediaId: Int) {
              Media(id: $mediaId) {
                recommendations(page: 1, perPage: 6, sort: RATING_DESC) {
                  nodes {
                    id
                    rating
                    mediaRecommendation {
                      id
                      title {
                        userPreferred
                        english
                      }
                      coverImage { large }
                    }
                  }
                }
              }
            }
          `;
          const res = await fetch('/api/anilist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: q, variables: { mediaId: aniListMangaId } })
          });
          const json = await res.json();
          setSocialRecommendations(json.data?.Media?.recommendations?.nodes || []);
        } catch (e) {
          console.error("Failed to fetch recommendations:", e);
        } finally {
          setSocialRecommendationsLoading(false);
        }
      };

      fetchActivities();
      fetchRecommendations();
    }
  }, [detailsTab, aniListMangaId]);

  const localPostsForThisManga = useMemo(() => {
    try {
      const saved = localStorage.getItem('movieverse_local_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p.media?.id === aniListMangaId);
        }
      }
    } catch (e) { }
    return [];
  }, [aniListMangaId, socialActivities]);

  const combinedSocialActivities = useMemo(() => {
    return [...localPostsForThisManga, ...socialActivities].sort((a, b) => b.createdAt - a.createdAt);
  }, [localPostsForThisManga, socialActivities]);

  const handleSocialPostSubmit = () => {
    if (!socialPostText.trim() || !aniListMangaId || !selectedManga) return;

    let currentUser = { name: "Guest User", avatar: "" };
    try {
      const savedProfile = localStorage.getItem('movieverse_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.name) {
          currentUser = { name: parsed.name, avatar: parsed.avatar };
        }
      }
    } catch (e) { }

    const newPost = {
      id: Date.now(),
      userId: 999999,
      type: 'TEXT',
      text: socialPostText,
      replyCount: 0,
      likeCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      user: {
        id: 999999,
        name: currentUser.name,
        avatar: {
          large: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ef4444&color=fff`
        }
      },
      media: {
        id: aniListMangaId,
        title: {
          userPreferred: getMangaTitle(selectedManga),
          english: getMangaTitle(selectedManga)
        },
        coverImage: {
          large: selectedManga.coverImage || ''
        }
      },
      isLocal: true
    };

    try {
      const saved = localStorage.getItem('movieverse_local_posts');
      const currentPosts = saved ? JSON.parse(saved) : [];
      const updated = [newPost, ...currentPosts];
      localStorage.setItem('movieverse_local_posts', JSON.stringify(updated));
    } catch (e) { }

    setSocialActivities(prev => [newPost, ...prev]);
    setSocialPostText("");
  };

  // MangaPill states (generalized for all Consumet providers)
  const [readingSource, setReadingSource] = useState<string>('weebcentral');
  const [mangapillMangaId, setMangapillMangaId] = useState<string | null>(null);
  const [mangapillChapters, setMangapillChapters] = useState<any[]>([]);
  const [mangapillLoading, setMangapillLoading] = useState(false);
  const [mangapillError, setMangapillError] = useState<string | null>(null);
  const [resolvedProvider, setResolvedProvider] = useState<string | null>(null);
  const [isAutoResolving, setIsAutoResolving] = useState(false);
  const [recommendations, setRecommendations] = useState<MangaDexManga[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [relations, setRelations] = useState<any[]>([]);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const [useNativeGigaViewer, setUseNativeGigaViewer] = useState(false);
  const useNativeGigaViewerRef = useRef(useNativeGigaViewer);
  useEffect(() => {
    useNativeGigaViewerRef.current = useNativeGigaViewer;
  }, [useNativeGigaViewer]);
  const [pastedGigaViewerUrl, setPastedGigaViewerUrl] = useState('');
  const [resolvedGigaViewerUrl, setResolvedGigaViewerUrl] = useState<string | null>(null);
  const [isResolvingGigaViewer, setIsResolvingGigaViewer] = useState(false);
  const [gigaViewerMappingError, setGigaViewerMappingError] = useState<string | null>(null);
  const [gigaViewerHost, setGigaViewerHost] = useState('shonenjumpplus.com');

  // Reader Overlay
  const [activeChapter, setActiveChapter] = useState<MangaDexChapter | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [readerMode, setReaderMode] = useState<'single' | 'strip' | 'double'>('strip');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [chapterServerData, setChapterServerData] = useState<any | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

  // Premium Reader settings states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<'normal' | 'wide' | 'full'>('wide');
  const [readerBg, setReaderBg] = useState<'black' | 'gray' | 'darker'>('black');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDetailsExiting, setIsDetailsExiting] = useState(false);
  const [isReaderExiting, setIsReaderExiting] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);





  const pageOptions = useMemo(() => {
    if (readerMode === 'double') {
      const opts = [{ value: '0', label: 'Page 1 (Cover)' }];
      for (let i = 1; i < pages.length; i += 2) {
        const next = Math.min(pages.length, i + 2);
        opts.push({
          value: String(i),
          label: `Pages ${i + 1} - ${next}`
        });
      }
      return opts;
    } else {
      return pages.map((_, i) => ({
        value: String(i),
        label: `Page ${i + 1} / ${pages.length}`
      }));
    }
  }, [readerMode, pages]);

  const sourceOptions = useMemo(() => [
    { value: 'mangadex', label: 'MangaDex (Official)' },
    { value: 'comick', label: 'ComicK (Recommended)' },
    { value: 'mangapill', label: 'MangaPill (Mainstream)' },
    { value: 'mangareader', label: 'MangaReader' },
    { value: 'mangakakalot', label: 'MangaKakalot' },
    { value: 'asurascans', label: 'AsuraScans' },
    { value: 'weebcentral', label: 'WeebCentral' },
    { value: 'mangahere', label: 'MangaHere' }
  ], []);

  const languageOptions = useMemo(() => {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      value: code,
      label: name as string
    }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable fullscreen mode:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error("Error attempting to exit fullscreen mode:", err);
        });
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  const prevMangaIdRef = useRef<string | null>(null);
  const prevCharIdRef = useRef<number | null>(null);
  const prevStaffIdRef = useRef<number | null>(null);
  const prevStudioIdRef = useRef<number | null>(null);

  // Reset scroll to top on mount and view transitions
  useEffect(() => {
    const isNewManga = selectedMangaId && selectedMangaId !== prevMangaIdRef.current;
    const isNewChar = selectedCharacterId && selectedCharacterId !== prevCharIdRef.current;
    const isNewStaff = selectedStaffId && selectedStaffId !== prevStaffIdRef.current;
    const isNewStudio = selectedStudioId && selectedStudioId !== prevStudioIdRef.current;

    if (isNewManga || isNewChar || isNewStaff || isNewStudio) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    prevMangaIdRef.current = selectedMangaId;
    prevCharIdRef.current = selectedCharacterId;
    prevStaffIdRef.current = selectedStaffId;
    prevStudioIdRef.current = selectedStudioId;
  }, [selectedMangaId, selectedCharacterId, selectedStaffId, selectedStudioId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsExiting(true);
    setTimeout(() => {
      if (onCloseDetails) {
        onCloseDetails();
      } else {
        onMangaSelect(null);
      }
      setIsDetailsExiting(false);
    }, 300);
  }, [onMangaSelect, onCloseDetails]);

  const handleCloseReader = useCallback(() => {
    setIsReaderExiting(true);
    setTimeout(() => {
      onChapterSelect(null);
      setIsReaderExiting(false);
    }, 300);
  }, [onChapterSelect]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Sync bookmark status
  useEffect(() => {
    if (!selectedManga) {
      setIsBookmarked(false);
      return;
    }
    const bookmarks = JSON.parse(localStorage.getItem('movieverse_manga_bookmarks') || '[]');
    setIsBookmarked(bookmarks.includes(selectedManga.id));
  }, [selectedManga]);

  const toggleBookmark = useCallback(() => {
    if (!selectedManga) return;
    const bookmarks = JSON.parse(localStorage.getItem('movieverse_manga_bookmarks') || '[]');
    let newBookmarks = [...bookmarks];
    if (newBookmarks.includes(selectedManga.id)) {
      newBookmarks = newBookmarks.filter(id => id !== selectedManga.id);
      setIsBookmarked(false);
      showToast('Removed from Bookmarks');
    } else {
      newBookmarks.push(selectedManga.id);
      setIsBookmarked(true);
      showToast('Added to Bookmarks');
    }
    localStorage.setItem('movieverse_manga_bookmarks', JSON.stringify(newBookmarks));
  }, [selectedManga, showToast]);



  // Fetch helper
  const fetchMangaDex = useCallback(async (endpoint: string) => {
    const res = await window.fetch(`/api/mangadex${endpoint}`);
    if (!res.ok) throw new Error(`MangaDex request failed: ${res.statusText}`);
    return res.json();
  }, []);

  const handleMangaSelect = useCallback(async (id: string | null, optionalTitle?: string) => {
    if (!id) {
      onMangaSelect(null);
      return;
    }

    if (id.startsWith('anilist-')) {
      const aniIdStr = id.replace('anilist-', '');
      const aniId = parseInt(aniIdStr, 10);

      onMangaSelect(id);

      try {
        const allItems = [...trending, ...popular, ...topRated, ...characterModalMediaManga, ...staffMedia, ...studioMedia];
        const item = allItems.find((x: any) => x.id === id) as any;
        const title = optionalTitle || item?.attributes?.title?.en || item?.attributes?.title?.['ja-ro'] || "";

        console.log(`[AniList-to-MangaDex] Resolving MangaDex ID for AniList ID ${aniId} ("${title}")...`);

        const searchRes = await fetchMangaDex(`/manga?title=${encodeURIComponent(title)}&limit=10&includes[]=cover_art`);
        const searchList = searchRes.data || [];

        const match = searchList.find((m: any) => m.attributes?.links?.al === String(aniId)) || searchList[0];

        if (match) {
          console.log(`[AniList-to-MangaDex] Resolved to MangaDex ID: ${match.id}`);
          onMangaSelect(match.id);
        } else {
          throw new Error("No matching MangaDex entry found");
        }
      } catch (err) {
        console.error("[AniList-to-MangaDex] Resolution failed:", err);
        showToast("Manga not found on MangaDex");
        onMangaSelect(null);
      }
    } else {
      onMangaSelect(id);
    }
  }, [onMangaSelect, trending, popular, topRated, characterModalMediaManga, staffMedia, studioMedia, fetchMangaDex, showToast]);

  // GraphQL fetch helper for AniList
  const fetchAniList = useCallback(async (query: string, variables: any = {}) => {
    const url = '/api/anilist';
    const response = await window.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    });

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || 'GraphQL Error');
    }
    return json.data;
  }, []);

  const mapAniListToMangaDex = useCallback(async (aniListMedia: any[], ratings: string) => {
    if (!aniListMedia || aniListMedia.length === 0) return [];
    const ids = aniListMedia.map(m => m.id);
    const externalIdParams = ids.map(id => `externalIds[al][]=${id}`).join('&');
    try {
      const endpoint = `/manga?limit=100&includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=serialization&availableTranslatedLanguage[]=en${ratings}&${externalIdParams}`;
      const res = await fetchMangaDex(endpoint);
      const mangadexList: MangaDexManga[] = res.data || [];
      const mapped: MangaDexManga[] = [];
      for (const media of aniListMedia) {
        const found = mangadexList.find(m => m.attributes?.links?.al === String(media.id));
        if (found) {
          mapped.push(found);
        }
      }
      return mapped;
    } catch (err) {
      console.error("Failed to map AniList to MangaDex:", err);
      return [];
    }
  }, [fetchMangaDex]);

  const fetchMangaCharacters = useCallback(async (manga: MangaDexManga) => {
    setCharactersLoading(true);
    setCharactersError(null);
    try {
      const links = manga.attributes.links || {};
      const alId = links.al ? parseInt(links.al, 10) : null;
      const malId = links.mal ? parseInt(links.mal, 10) : null;

      let query = '';
      let variables: any = {};

      if (alId && !isNaN(alId)) {
        query = `
          query ($id: Int) {
            Media(id: $id, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { id: alId };
      } else if (malId && !isNaN(malId)) {
        query = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { idMal: malId };
      } else {
        const title = getMangaTitle(manga);
        query = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              characters(sort: [ROLE, RELEVANCE, ID], perPage: 24) {
                edges {
                  role
                  node {
                    id
                    name {
                      userPreferred
                      full
                    }
                    image {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { search: title };
      }

      const res = await fetchAniList(query, variables);
      if (res && res.Media && res.Media.characters && res.Media.characters.edges) {
        setCharacters(res.Media.characters.edges);
      } else {
        setCharacters([]);
      }
    } catch (err: any) {
      console.error("Failed to load manga characters:", err);
      setCharactersError(err.message || "Failed to load characters");
      setCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  }, [fetchAniList, getMangaTitle]);

  const fetchMangaRecommendations = useCallback(async (manga: MangaDexManga) => {
    setRecLoading(true);
    try {
      const links = manga.attributes.links || {};
      const alId = links.al ? parseInt(links.al, 10) : null;
      const malId = links.mal ? parseInt(links.mal, 10) : null;

      let query = '';
      let variables: any = {};

      if (alId && !isNaN(alId)) {
        query = `
          query ($id: Int) {
            Media(id: $id, type: MANGA) {
              recommendations(sort: [RATING_DESC, ID], perPage: 12) {
                nodes {
                  mediaRecommendation {
                    id
                    title {
                      userPreferred
                      english
                      romaji
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { id: alId };
      } else if (malId && !isNaN(malId)) {
        query = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: MANGA) {
              recommendations(sort: [RATING_DESC, ID], perPage: 12) {
                nodes {
                  mediaRecommendation {
                    id
                    title {
                      userPreferred
                      english
                      romaji
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { idMal: malId };
      } else {
        const title = getMangaTitle(manga);
        query = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              recommendations(sort: [RATING_DESC, ID], perPage: 12) {
                nodes {
                  mediaRecommendation {
                    id
                    title {
                      userPreferred
                      english
                      romaji
                    }
                    coverImage {
                      large
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { search: title };
      }

      const res = await fetchAniList(query, variables);
      if (res && res.Media && res.Media.recommendations && res.Media.recommendations.nodes) {
        const nodes = res.Media.recommendations.nodes;
        const validNodes = nodes
          .map((n: any) => n.mediaRecommendation)
          .filter(Boolean);

        // Translate all recommended AniList items to MangaDexManga format
        const mapped = validNodes.map((aniMedia: any) => translateAniListToManga(aniMedia));
        setRecommendations(mapped);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error("Failed to load manga recommendations:", err);
      setRecommendations([]);
    } finally {
      setRecLoading(false);
    }
  }, [fetchAniList, getMangaTitle]);

  const fetchMangaReviews = useCallback(async (manga: MangaDexManga) => {
    setReviewsLoading(true);
    try {
      const links = manga.attributes.links || {};
      const alId = links.al ? parseInt(links.al, 10) : null;
      const malId = links.mal ? parseInt(links.mal, 10) : null;

      let query = '';
      let variables: any = {};

      if (alId && !isNaN(alId)) {
        query = `
          query ($id: Int) {
            Media(id: $id, type: MANGA) {
              reviews(limit: 8, sort: [RATING_DESC, ID]) {
                nodes {
                  id
                  summary
                  body
                  rating
                  score
                  user {
                    id
                    name
                    avatar {
                      medium
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { id: alId };
      } else if (malId && !isNaN(malId)) {
        query = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: MANGA) {
              reviews(limit: 8, sort: [RATING_DESC, ID]) {
                nodes {
                  id
                  summary
                  body
                  rating
                  score
                  user {
                    id
                    name
                    avatar {
                      medium
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { idMal: malId };
      } else {
        const title = getMangaTitle(manga);
        query = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              reviews(limit: 8, sort: [RATING_DESC, ID]) {
                nodes {
                  id
                  summary
                  body
                  rating
                  score
                  user {
                    id
                    name
                    avatar {
                      medium
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { search: title };
      }

      const res = await fetchAniList(query, variables);
      if (res && res.Media && res.Media.reviews && res.Media.reviews.nodes) {
        setReviews(res.Media.reviews.nodes);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error("Failed to load manga reviews:", err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [fetchAniList, getMangaTitle]);

  const fetchAniListMangaDetails = useCallback(async (manga: MangaDexManga) => {
    setAniListMangaLoading(true);
    try {
      const links = manga.attributes.links || {};
      const alId = links.al ? parseInt(links.al, 10) : null;
      const malId = links.mal ? parseInt(links.mal, 10) : null;

      let query = '';
      let variables: any = {};

      if (alId && !isNaN(alId)) {
        query = `
          query ($id: Int) {
            Media(id: $id, type: MANGA) {
              id
              nextAiringEpisode {
                episode
                airingAt
                timeUntilAiring
              }
              staff {
                edges {
                  role
                  node {
                    id
                    name {
                      full
                      native
                    }
                    image {
                      large
                    }
                  }
                }
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                    type
                    title {
                      userPreferred
                    }
                    nextAiringEpisode {
                      episode
                      airingAt
                      timeUntilAiring
                    }
                    studios(isMain: true) {
                      edges {
                        isMain
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { id: alId };
      } else if (malId && !isNaN(malId)) {
        query = `
          query ($idMal: Int) {
            Media(idMal: $idMal, type: MANGA) {
              id
              nextAiringEpisode {
                episode
                airingAt
                timeUntilAiring
              }
              staff {
                edges {
                  role
                  node {
                    id
                    name {
                      full
                      native
                    }
                    image {
                      large
                    }
                  }
                }
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                    type
                    title {
                      userPreferred
                    }
                    nextAiringEpisode {
                      episode
                      airingAt
                      timeUntilAiring
                    }
                    studios(isMain: true) {
                      edges {
                        isMain
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { idMal: malId };
      } else {
        const title = getMangaTitle(manga);
        query = `
          query ($search: String) {
            Media(search: $search, type: MANGA) {
              id
              nextAiringEpisode {
                episode
                airingAt
                timeUntilAiring
              }
              staff {
                edges {
                  role
                  node {
                    id
                    name {
                      full
                      native
                    }
                    image {
                      large
                    }
                  }
                }
              }
              relations {
                edges {
                  relationType
                  node {
                    id
                    type
                    title {
                      userPreferred
                    }
                    nextAiringEpisode {
                      episode
                      airingAt
                      timeUntilAiring
                    }
                    studios(isMain: true) {
                      edges {
                        isMain
                        node {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        variables = { search: title };
      }

      const res = await fetchAniList(query, variables);
      if (res && res.Media) {
        setAniListMangaData(res.Media);
      } else {
        setAniListMangaData(null);
      }
    } catch (err) {
      console.error("Failed to load AniList manga details:", err);
      setAniListMangaData(null);
    } finally {
      setAniListMangaLoading(false);
    }
  }, [fetchAniList, getMangaTitle]);

  const fetchStaffDetails = useCallback(async (id: number) => {
    setStaffDetailsLoading(true);
    setStaffDetailsError(null);
    setStaffMedia([]);
    setStaffMediaLoading(true);
    try {
      const query = `
        query ($id: Int) {
          Staff(id: $id) {
            id
            name {
              full
              native
              alternative
            }
            image {
              large
            }
            description
            homeTown
            dateOfBirth {
              year
              month
              day
            }
            dateOfDeath {
              year
              month
              day
            }
            language
            staffMedia(perPage: 24, type: MANGA) {
              nodes {
                id
                title {
                  english
                  romaji
                  userPreferred
                }
                coverImage {
                  large
                }
              }
            }
          }
        }
      `;
      const res = await fetchAniList(query, { id });
      if (res && res.Staff) {
        setStaffDetails(res.Staff);
        const nodes = res.Staff.staffMedia?.nodes || [];
        const mapped = nodes.map((m: any) => translateAniListToManga(m));
        setStaffMedia(mapped);
      } else {
        setStaffDetails(null);
      }
    } catch (err: any) {
      console.error("Failed to load staff details:", err);
      setStaffDetailsError(err.message || "Failed to load staff details");
    } finally {
      setStaffDetailsLoading(false);
      setStaffMediaLoading(false);
    }
  }, [fetchAniList]);

  const fetchStudioDetails = useCallback(async (id: number) => {
    setStudioDetailsLoading(true);
    setStudioDetailsError(null);
    setStudioMedia([]);
    setStudioMediaLoading(true);
    try {
      const query = `
        query ($id: Int) {
          Studio(id: $id) {
            id
            name
            favourites
            media(isMain: true, perPage: 24, sort: [POPULARITY_DESC]) {
              nodes {
                id
                title {
                  english
                  romaji
                  userPreferred
                }
                coverImage {
                  large
                }
                type
              }
            }
          }
        }
      `;
      const res = await fetchAniList(query, { id });
      if (res && res.Studio) {
        setStudioDetails(res.Studio);
        const nodes = res.Studio.media?.nodes || [];
        const mapped = nodes.map((m: any) => translateAniListToManga(m));
        setStudioMedia(mapped);
      } else {
        setStudioDetails(null);
      }
    } catch (err: any) {
      console.error("Failed to load studio details:", err);
      setStudioDetailsError(err.message || "Failed to load studio details");
    } finally {
      setStudioDetailsLoading(false);
      setStudioMediaLoading(false);
    }
  }, [fetchAniList]);

  const handleStaffSearchAndSelect = useCallback(async (name: string) => {
    setStaffDetailsLoading(true);
    setStaffDetailsError(null);
    try {
      const query = `
        query ($search: String) {
          Page(perPage: 1) {
            staff(search: $search) {
              id
            }
          }
        }
      `;
      const cleanName = name.replace(/\([^)]*\)/g, '').trim();
      const res = await fetchAniList(query, { search: cleanName });
      const staffList = res?.Page?.staff || [];
      if (staffList.length > 0) {
        setSelectedStaffId(staffList[0].id);
      } else {
        const parts = cleanName.split(/\s+/);
        if (parts.length > 1) {
          const res2 = await fetchAniList(query, { search: parts[parts.length - 1] });
          const staffList2 = res2?.Page?.staff || [];
          if (staffList2.length > 0) {
            setSelectedStaffId(staffList2[0].id);
            return;
          }
        }
        showToast(`Could not find "${name}" on AniList`);
      }
    } catch (e) {
      console.error("Staff resolution error:", e);
      showToast(`Could not resolve "${name}"`);
    } finally {
      setStaffDetailsLoading(false);
    }
  }, [fetchAniList, showToast]);

  const resolveMangaPill = useCallback(async (manga: MangaDexManga, provider = readingSource) => {
    if (useNativeGigaViewerRef.current) return;
    if (resolvedProvider === provider && mangapillChapters.length > 0) {
      setMangapillError(null);
      return; // Already resolved for this provider!
    }
    setMangapillLoading(true);
    setMangapillError(null);
    setMangapillMangaId(null);
    setMangapillChapters([]);
    try {
      const title = getMangaTitle(manga);
      const searchRes = await window.fetch(`/api/manga?action=search&provider=${provider}&query=${encodeURIComponent(title)}`);
      if (!searchRes.ok) throw new Error(`Search on ${provider} failed`);
      const searchList = await searchRes.json();

      if (!searchList || searchList.length === 0) {
        throw new Error(`No matching manga found on ${provider}`);
      }

      const bestMatch = searchList[0];
      setMangapillMangaId(bestMatch.id);

      const infoRes = await window.fetch(`/api/manga?action=info&provider=${provider}&id=${encodeURIComponent(bestMatch.id)}`);
      if (!infoRes.ok) throw new Error(`Failed to fetch chapters from ${provider}`);
      const infoData = await infoRes.json();

      setMangapillChapters(infoData.chapters || []);
      setResolvedProvider(provider);
    } catch (err: any) {
      console.error(`${provider} resolution error:`, err);
      setMangapillError(err.message || `Failed to resolve ${provider} source`);
    } finally {
      setMangapillLoading(false);
    }
  }, [getMangaTitle, readingSource, resolvedProvider, mangapillChapters.length]);

  const getContentRatingParams = useCallback(() => {
    let params = '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica';
    if (includeNsfw) {
      params += '&contentRating[]=pornographic';
    }
    return params;
  }, [includeNsfw]);

  // Sync selectedManga details, statistics, and relations with selectedMangaId prop
  useEffect(() => {
    if (!selectedMangaId || selectedMangaId.startsWith('anilist-')) {
      setSelectedManga(null);
      setStatistics(null);
      setRelations([]);
      setChapterFilter('');
      setDetailsTab('chapters');
      setSelectedLanguage('en');
      setReadingSource('weebcentral');
      setMangapillMangaId(null);
      setMangapillChapters([]);
      setResolvedProvider(null);
      setMangapillError(null);
      setUseNativeGigaViewer(false);
      setPastedGigaViewerUrl('');
      setResolvedGigaViewerUrl(null);
      setGigaViewerMappingError(null);
      return;
    }
    let isMounted = true;
    setUseNativeGigaViewer(false);
    setPastedGigaViewerUrl('');
    setResolvedGigaViewerUrl(null);
    setGigaViewerMappingError(null);

    const fetchSelectedMangaDetails = async () => {
      try {
        const data = await fetchMangaDex(`/manga/${selectedMangaId}?includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=serialization`);
        if (isMounted && data.data) {
          setSelectedManga(data.data);
        }
      } catch (err) {
        console.error("Failed to load selected manga details:", err);
      }
    };

    const fetchMangaStats = async () => {
      try {
        const statsData = await fetchMangaDex(`/statistics/manga/${selectedMangaId}`);
        if (isMounted && statsData.statistics && statsData.statistics[selectedMangaId]) {
          setStatistics(statsData.statistics[selectedMangaId]);
        }
      } catch (e) {
        console.error("Failed to fetch manga statistics:", e);
      }
    };

    const fetchMangaRelations = async () => {
      setRelationsLoading(true);
      try {
        const relData = await fetchMangaDex(`/manga/${selectedMangaId}/relation`);
        const relationsList = relData.data || [];

        // Extract related manga IDs
        const relatedIds = relationsList
          .map((rel: any) => rel.relationships?.find((r: any) => r.type === 'manga')?.id)
          .filter(Boolean);

        if (relatedIds.length > 0) {
          // Fetch full manga details for related items in one batch!
          const batchRes = await fetchMangaDex(`/manga?limit=100&ids[]=${relatedIds.join('&ids[]=')}&includes[]=cover_art`);
          const batchMangas = batchRes.data || [];

          // Re-map the related manga relationships with the full objects containing cover arts!
          const mappedRelations = relationsList.map((rel: any) => {
            const relManga = rel.relationships?.find((r: any) => r.type === 'manga');
            if (relManga) {
              const fullManga = batchMangas.find((m: any) => m.id === relManga.id);
              if (fullManga) {
                // Replace or enrich relManga relationship with cover_art!
                return {
                  ...rel,
                  relationships: rel.relationships.map((r: any) => r.type === 'manga' ? fullManga : r)
                };
              }
            }
            return rel;
          });

          if (isMounted) {
            setRelations(mappedRelations);
          }
        } else {
          if (isMounted) {
            setRelations([]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch manga relations:", e);
        if (isMounted) setRelations([]);
      } finally {
        if (isMounted) setRelationsLoading(false);
      }
    };

    fetchSelectedMangaDetails();
    fetchMangaStats();
    fetchMangaRelations();

    return () => { isMounted = false; };
  }, [selectedMangaId, fetchMangaDex]);

  const autoSelectBestProvider = useCallback(async (manga: MangaDexManga) => {
    setIsAutoResolving(true);
    try {
      const title = getMangaTitle(manga);
      console.log(`[Auto-Detector] Starting search for "${title}"...`);

      // Helper to fetch with timeout
      const fetchWithTimeout = async (url: string, ms = 3000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ms);
        try {
          const response = await window.fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      // We will check: mangadex, weebcentral, comick, mangapill
      let maxDexChapter = 0;
      try {
        const res = await fetchMangaDex(`/manga/${manga.id}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=1`);
        if (res && res.data && res.data[0]) {
          maxDexChapter = parseFloat(res.data[0].attributes?.chapter) || 0;
        }
      } catch (e) {
        console.warn("[Auto-Detector] Failed to fetch max MangaDex chapter:", e);
      }

      console.log(`[Auto-Detector] MangaDex max chapter: ${maxDexChapter}`);

      const providersToCheck = ['weebcentral', 'comick', 'mangapill'];
      let bestProvider = 'mangadex';
      let maxChapterNum = maxDexChapter;
      let resolvedChaptersMap: Record<string, any[]> = {};
      let resolvedMangaIdMap: Record<string, string> = {};

      const priority: Record<string, number> = {
        'weebcentral': 4,
        'comick': 3,
        'mangapill': 2,
        'mangadex': 1
      };

      const parseChapterNumber = (ch: any): number => {
        if (!ch) return 0;
        if (ch.chapter !== undefined && ch.chapter !== null) {
          const num = parseFloat(ch.chapter);
          if (!isNaN(num)) return num;
        }
        if (ch.number !== undefined && ch.number !== null) {
          const num = parseFloat(ch.number);
          if (!isNaN(num)) return num;
        }
        const fieldsToSearch = [ch.title, ch.chapter, ch.number, ch.id].filter(Boolean);
        for (const field of fieldsToSearch) {
          const match = String(field).match(/(\d+(?:\.\d+)?)/);
          if (match) {
            const num = parseFloat(match[1]);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };

      const promises = providersToCheck.map(async (prov) => {
        try {
          console.log(`[Auto-Detector] Fetching search matches for ${prov}...`);
          const searchRes = await fetchWithTimeout(`/api/manga?action=search&provider=${prov}&query=${encodeURIComponent(title)}`, 3000);
          if (!searchRes.ok) {
            console.warn(`[Auto-Detector] Search request failed for ${prov}: ${searchRes.statusText}`);
            return;
          }
          const searchList = await searchRes.json();
          if (!searchList || searchList.length === 0) {
            console.log(`[Auto-Detector] No matches found for ${prov}`);
            return;
          }

          const bestMatch = searchList[0];
          console.log(`[Auto-Detector] Found match for ${prov}: ${bestMatch.title || bestMatch.id}`);

          const infoRes = await fetchWithTimeout(`/api/manga?action=info&provider=${prov}&id=${encodeURIComponent(bestMatch.id)}`, 3000);
          if (!infoRes.ok) {
            console.warn(`[Auto-Detector] Info request failed for ${prov}: ${infoRes.statusText}`);
            return;
          }
          const infoData = await infoRes.json();

          const chList = infoData.chapters || [];
          if (chList.length === 0) {
            console.log(`[Auto-Detector] Provider ${prov} returned 0 chapters`);
            return;
          }

          resolvedChaptersMap[prov] = chList;
          resolvedMangaIdMap[prov] = bestMatch.id;

          let maxCh = 0;
          for (const ch of chList) {
            const num = parseChapterNumber(ch);
            if (num > maxCh) maxCh = num;
          }

          console.log(`[Auto-Detector] Provider ${prov} has ${chList.length} chapters, max chapter parsed: ${maxCh}`);

          if (resolvedMangaIdMap[prov] && chList.length > 0) {
            if (maxCh > maxChapterNum || (maxCh === maxChapterNum && (priority[prov] || 0) > (priority[bestProvider] || 0))) {
              maxChapterNum = maxCh;
              bestProvider = prov;
              console.log(`[Auto-Detector] New best provider candidate: ${bestProvider} with chapter: ${maxChapterNum}`);
            }
          }
        } catch (err) {
          console.warn(`[Auto-Detector] Failed to auto-resolve provider ${prov}:`, err);
        }
      });

      await Promise.all(promises);

      console.log(`[Auto-Detector] Final decision: ${bestProvider} with chapter ${maxChapterNum} (MangaDex had ${maxDexChapter})`);

      if (useNativeGigaViewerRef.current) {
        return;
      }

      if (bestProvider !== 'mangadex') {
        setResolvedProvider(bestProvider);
        setMangapillMangaId(resolvedMangaIdMap[bestProvider] || null);
        setMangapillChapters(resolvedChaptersMap[bestProvider] || []);
        setMangapillError(null);
        setReadingSource(bestProvider);
      } else {
        setReadingSource('mangadex');
        setResolvedProvider('mangadex');
        setMangapillError(null);
      }
    } catch (error) {
      console.error("[Auto-Detector] Critical error in autoSelectBestProvider:", error);
    } finally {
      setIsAutoResolving(false);
    }
  }, [getMangaTitle, fetchMangaDex]);

  // Automatically select the best source provider when a manga is selected
  useEffect(() => {
    if (!selectedManga || useNativeGigaViewer) {
      setResolvedProvider(null);
      return;
    }
    setResolvedProvider(null);
    autoSelectBestProvider(selectedManga);
  }, [selectedManga, autoSelectBestProvider, useNativeGigaViewer]);

  // Reset scroll position and reader top/bottom bars when details page or reader state changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setShowTopBar(true);
    setShowBottomBar(false);
    lastScrollTopRef.current = 0;
  }, [selectedMangaId, activeChapterId]);

  // Hide controls in fullscreen mode after 3 seconds of mouse inactivity
  useEffect(() => {
    if (!isFullscreen) {
      setIsMenuVisible(true);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleMouseMove = () => {
      setIsMenuVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsMenuVisible(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, [isFullscreen]);

  // Sync activeChapter with activeChapterId prop
  useEffect(() => {
    if (!activeChapterId) {
      setActiveChapter(null);
      return;
    }
    if (readingSource !== 'mangadex') {
      const ch = mangapillChapters.find(c => c.id === activeChapterId);
      if (ch) {
        setActiveChapter({
          id: ch.id,
          attributes: {
            title: ch.title || '',
            chapter: ch.chapterNumber?.toString() || ch.chapter || ch.title?.match(/Chapter\s+([\d.]+)/i)?.[1] || '',
            pages: 0,
            publishAt: ch.releaseDate || ch.released || ch.releasedDate || ch.date || ''
          }
        } as any);
      }
      return;
    }
    let isMounted = true;
    const fetchSelectedChapterDetails = async () => {
      try {
        const data = await fetchMangaDex(`/chapter/${activeChapterId}`);
        if (isMounted && data.data) {
          setActiveChapter(data.data);
        }
      } catch (err) {
        console.error("Failed to load active chapter details:", err);
      }
    };
    fetchSelectedChapterDetails();
    return () => { isMounted = false; };
  }, [activeChapterId, readingSource, mangapillChapters, fetchMangaDex]);

  // Update document title for Manga details & reader
  useEffect(() => {
    if (selectedManga) {
      const title = getMangaTitle(selectedManga);
      if (activeChapter) {
        document.title = `Chapter ${activeChapter.attributes.chapter || 'Oneshot'} - ${title} - MovieVerse AI`;
      } else {
        document.title = `${title} - MovieVerse AI`;
      }
    }
  }, [selectedManga, activeChapter, getMangaTitle]);

  // Load recommendations when selectedManga changes
  useEffect(() => {
    if (!selectedManga) {
      setRecommendations([]);
      return;
    }
    fetchMangaRecommendations(selectedManga);
  }, [selectedManga, fetchMangaRecommendations]);

  // Load characters when selectedManga changes
  useEffect(() => {
    if (!selectedManga) {
      setCharacters([]);
      return;
    }
    fetchMangaCharacters(selectedManga);
  }, [selectedManga, fetchMangaCharacters]);

  // Load AniList media details and reviews when selectedManga changes
  useEffect(() => {
    if (!selectedManga) {
      setAniListMangaData(null);
      setReviews([]);
      return;
    }
    fetchAniListMangaDetails(selectedManga);
    fetchMangaReviews(selectedManga);
  }, [selectedManga, fetchAniListMangaDetails, fetchMangaReviews]);

  // Load Staff details when selectedStaffId changes
  useEffect(() => {
    if (!selectedStaffId) {
      setStaffDetails(null);
      setStaffMedia([]);
      return;
    }
    fetchStaffDetails(selectedStaffId);
  }, [selectedStaffId, fetchStaffDetails]);

  // Load Studio details when selectedStudioId changes
  useEffect(() => {
    if (!selectedStudioId) {
      setStudioDetails(null);
      setStudioMedia([]);
      return;
    }
    fetchStudioDetails(selectedStudioId);
  }, [selectedStudioId, fetchStudioDetails]);

  // Load Character details when selectedCharacterId changes
  useEffect(() => {
    if (!selectedCharacterId) {
      setCharacterDetails(null);
      setCharacterModalMediaManga([]);
      return;
    }

    let isMounted = true;
    const fetchCharDetails = async () => {
      setCharacterDetailsLoading(true);
      setCharacterDetailsError(null);
      setCharacterModalMediaManga([]);
      setCharacterModalMediaLoading(true);

      const query = `
        query ($id: Int) {
          Character(id: $id) {
            id
            name {
              full
              native
              alternative
              alternativeSpoiler
            }
            image {
              large
            }
            description(asHtml: false)
            gender
            dateOfBirth {
              year
              month
              day
            }
            age
            bloodType
            media(type: MANGA, sort: POPULARITY_DESC, perPage: 12) {
              edges {
                node {
                  id
                  title {
                    romaji
                    english
                    native
                  }
                  coverImage {
                    large
                  }
                  description
                  startDate {
                    year
                  }
                  status
                  genres
                }
              }
            }
          }
        }
      `;

      try {
        const data = await fetchAniList(query, { id: selectedCharacterId });
        if (!isMounted) return;

        if (data && data.Character) {
          setCharacterDetails(data.Character);

          const mediaNodes = data.Character.media?.edges?.map((edge: any) => edge.node) || [];
          if (mediaNodes.length > 0 && isMounted) {
            const mappedMedia = mediaNodes.map(translateAniListToManga);
            setCharacterModalMediaManga(mappedMedia);
          }
        } else {
          throw new Error("Character not found");
        }
      } catch (err: any) {
        console.error("Failed to load character details:", err);
        if (isMounted) {
          setCharacterDetailsError(err.message || "Failed to load character details");
        }
      } finally {
        if (isMounted) {
          setCharacterDetailsLoading(false);
          setCharacterModalMediaLoading(false);
        }
      }
    };

    fetchCharDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedCharacterId, fetchAniList]);

  // Load MangaPill data when readingSource is set to mangapill
  useEffect(() => {
    if (!selectedManga || isAutoResolving || !resolvedProvider) {
      return;
    }
    if (readingSource !== 'mangadex' && readingSource !== 'gigaviewer' && readingSource !== 'kadocomi') {
      resolveMangaPill(selectedManga, readingSource);
    }
  }, [selectedManga, readingSource, resolveMangaPill, isAutoResolving, resolvedProvider]);

  // Load Initial Manga Lists
  const loadMangaCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ratings = getContentRatingParams();

      // 1. Recently Uploaded Chapters (keep on MangaDex)
      const latestPromise = fetchMangaDex(`/manga?limit=12&order[latestUploadedChapter]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`)
        .then(data => data.data || [])
        .catch(err => {
          console.error("Failed to load latest updates from MangaDex:", err);
          return [];
        });

      // Fetch Trending, Popular, and Top Rated from AniList
      const aniListQuery = `
        query {
          trending: Page(page: 1, perPage: 25) {
            media(type: MANGA, sort: [TRENDING_DESC], format_in: [MANGA, ONE_SHOT]) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              description
              startDate {
                year
              }
              status
              genres
            }
          }
          popular: Page(page: 1, perPage: 25) {
            media(type: MANGA, sort: [POPULARITY_DESC], format_in: [MANGA, ONE_SHOT]) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              description
              startDate {
                year
              }
              status
              genres
            }
          }
          topRated: Page(page: 1, perPage: 25) {
            media(type: MANGA, sort: [SCORE_DESC], format_in: [MANGA, ONE_SHOT]) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
              }
              description
              startDate {
                year
              }
              status
              genres
            }
          }
        }
      `;

      let trendingMapped: MangaDexManga[] = [];
      let popularMapped: MangaDexManga[] = [];
      let topRatedMapped: MangaDexManga[] = [];

      try {
        const aniListData = await fetchAniList(aniListQuery);

        trendingMapped = (aniListData.trending?.media || []).map(translateAniListToManga).slice(0, 12);
        popularMapped = (aniListData.popular?.media || []).map(translateAniListToManga).slice(0, 12);
        topRatedMapped = (aniListData.topRated?.media || []).map(translateAniListToManga).slice(0, 12);
      } catch (aniListErr) {
        console.error("Failed to load or map categories from AniList, falling back to MangaDex:", aniListErr);
        // Fallback to MangaDex queries
        const [fallbackTrending, fallbackTopRated] = await Promise.all([
          fetchMangaDex(`/manga?limit=12&order[followedCount]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`).then(d => d.data || []),
          fetchMangaDex(`/manga?limit=12&order[rating]=desc&includes[]=cover_art&availableTranslatedLanguage[]=en${ratings}`).then(d => d.data || [])
        ]);
        trendingMapped = fallbackTrending;
        popularMapped = fallbackTrending;
        topRatedMapped = fallbackTopRated;
      }

      const latestMapped = await latestPromise;

      setTrending(trendingMapped);
      setLatest(latestMapped);
      setPopular(popularMapped);
      setTopRated(topRatedMapped);

      // Reset endless categories
      setGenreRows([]);
      currentGenreIndexRef.current = 0;
    } catch (err: any) {
      console.error("Manga catalog load error:", err);
      setError(err?.message || "Failed to retrieve Manga catalog");
    } finally {
      setLoading(false);
    }
  }, [fetchMangaDex, fetchAniList, getContentRatingParams]);

  // Load next genre row
  const loadNextGenreRow = useCallback(async () => {
    if (loadingGenreRows || currentGenreIndexRef.current >= MANGA_GENRES.length) return;
    setLoadingGenreRows(true);
    const genre = MANGA_GENRES[currentGenreIndexRef.current];
    const ratings = getContentRatingParams();
    try {
      const data = await fetchMangaDex(`/manga?limit=12&includedTags[]=${genre.id}&includes[]=cover_art&order[followedCount]=desc&availableTranslatedLanguage[]=en${ratings}`);
      const list = data.data || [];
      if (list.length > 0) {
        setGenreRows(prev => [...prev, { genre: genre.name, media: list }]);
      }
      currentGenreIndexRef.current += 1;
    } catch (e) {
      console.error("Failed to load manga genre:", genre.name, e);
    } finally {
      setLoadingGenreRows(false);
    }
  }, [fetchMangaDex, loadingGenreRows, getContentRatingParams]);

  // Load first catalogs
  useEffect(() => {
    loadMangaCatalog();
  }, [loadMangaCatalog]);

  // Lazy load pre-load first row
  useEffect(() => {
    if (!loading && trending.length > 0 && genreRows.length === 0) {
      loadNextGenreRow();
    }
  }, [loading, trending, genreRows, loadNextGenreRow]);

  // Infinite Scroll Listener
  useEffect(() => {
    if (searchQuery || loading || selectedMangaId) return;
    const handleScroll = () => {
      const threshold = 1200;
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
      if (isNearBottom && !loadingGenreRows && currentGenreIndexRef.current < MANGA_GENRES.length) {
        loadNextGenreRow();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchQuery, loading, loadingGenreRows, loadNextGenreRow, selectedMangaId]);

  // Banner rotation
  useEffect(() => {
    if (trending.length === 0 || searchQuery || selectedMangaId) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
    }, 9000);
    return () => clearInterval(interval);
  }, [trending, searchQuery, selectedMangaId]);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => clearTimeout(delay);
  }, [searchInput]);

  // Debounce parent search query updates
  useEffect(() => {
    if (parentSearchQuery !== undefined) {
      setSearchInput(parentSearchQuery);
      const delay = setTimeout(() => {
        setSearchQuery(parentSearchQuery);
      }, 400);
      return () => clearTimeout(delay);
    }
  }, [parentSearchQuery]);

  // Search runner
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let isMounted = true;
    const runSearch = async () => {
      setSearchLoading(true);
      const ratings = getContentRatingParams();
      try {
        if (isAiSearchActive) {
          const aiRes = await fetch(`/api/ai-search?query=${encodeURIComponent(searchQuery)}&category=manga`);
          if (!aiRes.ok) throw new Error("AI search failed");
          const aiData = await aiRes.json();
          const titles = aiData.results || [];

          const promises = titles.map(async (t: string) => {
            try {
              const data = await fetchMangaDex(`/manga?limit=1&title=${encodeURIComponent(t)}&includes[]=cover_art${ratings}`);
              return data.data?.[0];
            } catch {
              return null;
            }
          });
          const results = await Promise.all(promises);
          const validResults = results.filter(m => m !== null && m !== undefined);
          if (isMounted) setSearchResults(validResults);
        } else {
          const data = await fetchMangaDex(`/manga?limit=24&title=${encodeURIComponent(searchQuery)}&includes[]=cover_art${ratings}`);
          if (isMounted) setSearchResults(data.data || []);
        }
      } catch (err) {
        console.error("Manga search failed:", err);
      } finally {
        if (isMounted) setSearchLoading(false);
      }
    };
    runSearch();
    return () => { isMounted = false; };
  }, [searchQuery, isAiSearchActive, fetchMangaDex, getContentRatingParams]);

  // GigaViewer Mapping Effect
  useEffect(() => {
    if (!selectedManga || !useNativeGigaViewer) {
      setResolvedGigaViewerUrl(null);
      setGigaViewerMappingError(null);
      return;
    }

    let isMounted = true;
    const resolveMapping = async () => {
      setIsResolvingGigaViewer(true);
      setGigaViewerMappingError(null);
      
      try {
        let queryTitle = '';
        if (selectedManga.attributes.altTitles) {
          const jaTitleObj = selectedManga.attributes.altTitles.find(t => t.ja || t['ja-ro']);
          if (jaTitleObj) {
            queryTitle = jaTitleObj.ja || jaTitleObj['ja-ro'] || '';
          }
        }
        if (!queryTitle) {
          queryTitle = selectedManga.attributes.title.en || selectedManga.attributes.title.ja || Object.values(selectedManga.attributes.title)[0] || '';
        }

        if (!queryTitle) {
          throw new Error("No search query found for GigaViewer search");
        }

        // Check if we already resolved a URL, and if the user changed the host manually
        let currentUrlHost = '';
        if (resolvedGigaViewerUrl) {
          try {
            currentUrlHost = new URL(resolvedGigaViewerUrl).hostname.replace('www.', '');
          } catch (e) {}
        }

        if (resolvedGigaViewerUrl && currentUrlHost === gigaViewerHost) {
          // Already resolved and matches the selected host, nothing to do!
          return;
        }

        if (gigaViewerHost === 'comic-walker.com') {
          // KadoComi manually selected
          const searchRes = await window.fetch(`/api/manga?action=search&provider=kadocomi&query=${encodeURIComponent(queryTitle)}`);
          if (!searchRes.ok) throw new Error("KadoComi search mapping failed");
          const results = await searchRes.json();
          if (results && results.length > 0) {
            if (isMounted) {
              setResolvedGigaViewerUrl(results[0].id);
            }
            return;
          } else {
            throw new Error("No matching manga found on KadoComi (ComicWalker)");
          }
        }

        if (resolvedGigaViewerUrl && currentUrlHost !== gigaViewerHost) {
          // User manually changed the host in the dropdown! Search specifically on this host.
          const searchRes = await window.fetch(`/api/manga?action=search&provider=gigaviewer&query=${encodeURIComponent(queryTitle)}&host=${gigaViewerHost}`);
          if (!searchRes.ok) throw new Error("Search mapping request failed");
          const results = await searchRes.json();
          
          if (results && results.length > 0) {
            if (isMounted) {
              setResolvedGigaViewerUrl(results[0].id);
            }
            return;
          } else {
            throw new Error(`No matching manga found on ${gigaViewerHost}`);
          }
        }

        // Tier 1: Check MangaDex raw link
        const rawLink = selectedManga.attributes.links?.raw;
        if (rawLink) {
          try {
            const parsed = new URL(rawLink);
            const host = parsed.hostname.replace('www.', '');
            const GIGAVIEWER_VALID_HOSTS = [
              "shonenjumpplus.com", "comic-days.com", "kuragebunch.com", 
              "tonarinoyj.jp", "www.sunday-webry.com", "feelweb.jp", 
              "magcomi.com", "comic-action.com", "comic-earthstar.com", 
              "comic-gardo.com", "comic-zenon.com", "viewer.heros-web.com",
              "comicborder.com", "feelweb.jp", "ichicomi.com", "ourfeel.jp"
            ];
            if (GIGAVIEWER_VALID_HOSTS.some(h => host === h || host.endsWith('.' + h))) {
              if (isMounted) {
                setResolvedGigaViewerUrl(rawLink);
                setGigaViewerHost(host);
                setIsResolvingGigaViewer(false);
                return;
              }
            }
            if (host === 'comic-walker.com' || host === 'kadocomi.jp' || host.endsWith('.comic-walker.com') || host.endsWith('.kadocomi.jp')) {
              if (isMounted) {
                setResolvedGigaViewerUrl(rawLink);
                setGigaViewerHost('comic-walker.com');
                setIsResolvingGigaViewer(false);
                return;
              }
            }
          } catch (e) {
            console.error("Failed to parse rawLink URL:", e);
          }
        }

        // Tier 2: Auto-detect best host by chapter count
        let bestResolvedUrl = '';
        let bestResolvedHost = '';
        
        try {
          const resolverRes = await window.fetch(`/api/manga?action=resolve-best-gigaviewer&provider=gigaviewer&query=${encodeURIComponent(queryTitle)}`);
          if (resolverRes.ok) {
            const bestSource = await resolverRes.json();
            if (bestSource && bestSource.url) {
              bestResolvedUrl = bestSource.url;
              bestResolvedHost = bestSource.host;
            }
          }
        } catch (resolverErr) {
          console.warn("Auto-detect best GigaViewer host failed:", resolverErr);
        }

        // Tier 3: Fall back to auto-detecting KadoComi if GigaViewer search failed
        if (!bestResolvedUrl) {
          try {
            const kadoRes = await window.fetch(`/api/manga?action=search&provider=kadocomi&query=${encodeURIComponent(queryTitle)}`);
            if (kadoRes.ok) {
              const results = await kadoRes.json();
              if (results && results.length > 0) {
                bestResolvedUrl = results[0].id;
                bestResolvedHost = 'comic-walker.com';
              }
            }
          } catch (kadoErr) {
            console.warn("Auto-detect KadoComi failed:", kadoErr);
          }
        }

        if (bestResolvedUrl && bestResolvedHost) {
          if (isMounted) {
            setResolvedGigaViewerUrl(bestResolvedUrl);
            setGigaViewerHost(bestResolvedHost);
            return;
          }
        }

        throw new Error("No GigaViewer or KadoComi mapping found automatically.");
      } catch (err: any) {
        console.error("Mapping error:", err);
        if (isMounted) {
          setGigaViewerMappingError(err.message || "Failed to find native chapters automatically.");
        }
      } finally {
        if (isMounted) {
          setIsResolvingGigaViewer(false);
        }
      }
    };

    resolveMapping();
    return () => { isMounted = false; };
  }, [selectedManga, useNativeGigaViewer, gigaViewerHost, resolvedGigaViewerUrl]);

  // Sync useNativeGigaViewer toggled off back to standard source
  useEffect(() => {
    if (!useNativeGigaViewer && selectedManga) {
      setReadingSource('weebcentral');
      setChapters([]);
    }
  }, [useNativeGigaViewer, selectedManga]);

  // Load GigaViewer Chapters
  useEffect(() => {
    if (!selectedManga || !useNativeGigaViewer) return;
    
    const targetUrl = pastedGigaViewerUrl.trim() || resolvedGigaViewerUrl;
    if (!targetUrl) {
      setChapters([]);
      return;
    }

    let isMounted = true;
    const fetchGigaChapters = async () => {
      setChaptersLoading(true);
      try {
        const isKado = gigaViewerHost === 'comic-walker.com' || targetUrl.includes('comic-walker.com') || targetUrl.includes('kadocomi');
        const providerName = isKado ? 'kadocomi' : 'gigaviewer';
        
        const res = await window.fetch(`/api/manga?action=info&provider=${providerName}&id=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`Failed to load ${isKado ? 'KadoComi' : 'GigaViewer'} chapters`);
        const data = await res.json();
        
        if (isMounted) {
          const mappedChapters = (data.chapters || []).map((ch: any) => ({
            id: ch.id,
            attributes: {
              title: ch.title,
              chapter: ch.chapter,
              publishAt: ch.releaseDate,
              pages: 0
            }
          }));
          setChapters(mappedChapters);
          setMangapillChapters(mappedChapters);
          setReadingSource(providerName);
        }
      } catch (err) {
        console.error("GigaViewer chapters load error:", err);
        showToast("Error loading raw chapters");
      } finally {
        if (isMounted) setChaptersLoading(false);
      }
    };

    fetchGigaChapters();
    return () => { isMounted = false; };
  }, [selectedManga, useNativeGigaViewer, resolvedGigaViewerUrl, pastedGigaViewerUrl]);

  // Load Chapter list on Details open
  useEffect(() => {
    if (!selectedManga || useNativeGigaViewer) {
      if (!selectedManga) setChapters([]);
      return;
    }
    let isMounted = true;
    const fetchChapters = async () => {
      setChaptersLoading(true);
      try {
        const data = await fetchMangaDex(`/manga/${selectedManga.id}/feed?translatedLanguage[]=${selectedLanguage}&order[chapter]=asc&limit=100`);
        const list: MangaDexChapter[] = data.data || [];

        // Filter unique chapters to prevent duplicate group uploads
        const unique: MangaDexChapter[] = [];
        const seen = new Set<string>();
        for (const ch of list) {
          const chNum = ch.attributes?.chapter || '';
          if (chNum && !seen.has(chNum)) {
            seen.add(chNum);
            unique.push(ch);
          }
        }

        if (isMounted) setChapters(unique);
      } catch (e) {
        console.error("Failed to load chapters:", e);
      } finally {
        if (isMounted) setChaptersLoading(false);
      }
    };
    fetchChapters();
    return () => { isMounted = false; };
  }, [selectedManga, selectedLanguage, fetchMangaDex]);

  // Load Chapter Pages on Reader active
  useEffect(() => {
    if (!activeChapter) {
      setPages([]);
      setChapterServerData(null);
      return;
    }
    let isMounted = true;
    const fetchPages = async () => {
      setPagesLoading(true);
      setActivePageIdx(0);
      try {
        if (readingSource === 'kadocomi') {
          const res = await window.fetch(`/api/manga?action=pages&provider=kadocomi&id=${encodeURIComponent(activeChapter.id)}`);
          if (!res.ok) throw new Error(`Failed to load pages from KadoComi`);
          const pageData = await res.json();
          if (!isMounted) return;

          const urls = pageData.map((p: any) => p.src);
          setPages(urls);
          setChapterServerData({ provider: 'kadocomi' });
          return;
        }

        if (readingSource === 'gigaviewer') {
          const res = await window.fetch(`/api/manga?action=pages&provider=gigaviewer&id=${encodeURIComponent(activeChapter.id)}`);
          if (!res.ok) throw new Error(`Failed to load pages from GigaViewer`);
          const pageData = await res.json();
          if (!isMounted) return;

          setPages(pageData);
          setChapterServerData({ provider: 'gigaviewer' });
          return;
        }

        if (readingSource !== 'mangadex') {
          const res = await window.fetch(`/api/manga?action=pages&provider=${readingSource}&id=${encodeURIComponent(activeChapter.id)}`);
          if (!res.ok) throw new Error(`Failed to load pages from ${readingSource}`);
          const pageData = await res.json();
          if (!isMounted) return;

          const urls = pageData.map((p: any) => `/api/manga?action=proxy-image&provider=${readingSource}&url=${encodeURIComponent(p.img || p.image || p.url)}`);
          setPages(urls);
          setChapterServerData({ provider: readingSource });
          return;
        }

        const data = await fetchMangaDex(`/at-home/server/${activeChapter.id}`);
        if (!isMounted) return;

        setChapterServerData(data);
        const baseUrl = data.baseUrl;
        const hash = data.chapter.hash;
        const fileNames = isDataSaver ? data.chapter.dataSaver : data.chapter.data;
        const folder = isDataSaver ? 'data-saver' : 'data';

        const urls = fileNames.map((f: string) => `${baseUrl}/${folder}/${hash}/${f}`);
        setPages(urls);
      } catch (e) {
        console.error("Failed to resolve chapter pages:", e);
        showToast("Error loading pages");
      } finally {
        if (isMounted) setPagesLoading(false);
      }
    };
    fetchPages();
    return () => { isMounted = false; };
  }, [activeChapter, isDataSaver, readingSource, fetchMangaDex, showToast]);

  // Sync pages when DataSaver is toggled
  useEffect(() => {
    if (!chapterServerData || readingSource !== 'mangadex') return;
    const baseUrl = chapterServerData.baseUrl;
    const hash = chapterServerData.chapter.hash;
    const fileNames = isDataSaver ? chapterServerData.chapter.dataSaver : chapterServerData.chapter.data;
    const folder = isDataSaver ? 'data-saver' : 'data';
    const urls = fileNames.map((f: string) => `${baseUrl}/${folder}/${hash}/${f}`);
    setPages(urls);
  }, [isDataSaver, chapterServerData, readingSource]);

  // Prefetch all chapter pages in the background for instant loading
  useEffect(() => {
    if (pages.length === 0) return;
    pages.forEach((page) => {
      const url = typeof page === 'string' ? page : `/api/manga?action=proxy-gigaviewer-image&url=${encodeURIComponent(page.src)}`;
      const img = new Image();
      img.src = url;
    });
  }, [pages]);

  const handleNextPage = useCallback(() => {
    if (readerMode === 'double') {
      if (activePageIdx >= pages.length - 1) return;
      setFlipDirection('next');
      setIsFlipping(true);
      setActivePageIdx(p => {
        if (p === 0) return 1;
        return Math.min(pages.length - 1, p + 2);
      });
      setTimeout(() => setIsFlipping(false), 600);
    } else {
      setActivePageIdx(p => Math.min(pages.length - 1, p + 1));
    }
  }, [readerMode, activePageIdx, pages.length]);

  const handlePrevPage = useCallback(() => {
    if (readerMode === 'double') {
      if (activePageIdx === 0) return;
      setFlipDirection('prev');
      setIsFlipping(true);
      setActivePageIdx(p => {
        if (p === 1) return 0;
        return Math.max(0, p - 2);
      });
      setTimeout(() => setIsFlipping(false), 600);
    } else {
      setActivePageIdx(p => Math.max(0, p - 1));
    }
  }, [readerMode, activePageIdx]);

  // Keyboard navigation & scrolling
  useEffect(() => {
    if (!activeChapter) return;
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (readerMode === 'strip' && readerScrollContainerRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          readerScrollContainerRef.current.scrollBy({ top: window.innerHeight * 0.4, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          readerScrollContainerRef.current.scrollBy({ top: -window.innerHeight * 0.4, behavior: 'smooth' });
        }
      } else if (readerMode === 'single' || readerMode === 'double') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleNextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handlePrevPage();
        }
      }

      if ((e.key === 'a' || e.key === 'A') && readerMode === 'strip') {
        e.preventDefault();
        setAutoScrollSpeed(s => (s + 1) % 4);
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseReader();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeChapter, readerMode, pages.length, handleNextPage, handlePrevPage]);

  // Track scroll position in strip mode
  useEffect(() => {
    const container = readerScrollContainerRef.current;
    if (!activeChapter || readerMode !== 'strip' || !container) {
      setScrollPercent(0);
      return;
    }
    const handleScroll = () => {
      const scrollHeight = container.scrollHeight - container.clientHeight;
      if (scrollHeight <= 0) {
        setScrollPercent(100);
        return;
      }
      const pct = Math.min(100, Math.max(0, Math.round((container.scrollTop / scrollHeight) * 100)));
      setScrollPercent(pct);
    };
    container.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeChapter, readerMode]);

  // Autoscroll animation loop in strip mode
  useEffect(() => {
    const container = readerScrollContainerRef.current;
    if (readerMode !== 'strip' || autoScrollSpeed === 0 || !container) return;

    let lastTime = performance.now();
    let frameId: number;

    const step = (time: number) => {
      if (!container) return;
      const elapsed = time - lastTime;
      let speedFactor = 0.02; // Slow
      if (autoScrollSpeed === 2) speedFactor = 0.06; // Med
      if (autoScrollSpeed === 3) speedFactor = 0.15; // Fast

      container.scrollTop += elapsed * speedFactor;
      lastTime = time;
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [autoScrollSpeed, readerMode]);

  // Resolve cover image helper
  const getMangaCover = (manga: MangaDexManga) => {
    const coverRel = manga.relationships?.find(r => r.type === 'cover_art');
    if (coverRel?.attributes?.fileName) {
      if (coverRel.attributes.fileName.startsWith('http')) {
        return coverRel.attributes.fileName;
      }
      return `https://uploads.mangadex.org/covers/${manga.id}/${coverRel.attributes.fileName}.512.jpg`;
    }
    return 'https://placehold.co/400x600/111/444?text=No+Cover';
  };

  const cleanDescription = (descStr: string | null) => {
    if (!descStr) return 'No description available.';
    return descStr.replace(/\[\/?spoiler\]/gi, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  };

  // Curate metadata fields
  const authors = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.filter(r => r.type === 'author')
      ?.map(r => r.attributes?.name)
      ?.filter(Boolean)
      ?.join(', ') || 'Unknown';
  }, [selectedManga]);

  const artists = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.filter(r => r.type === 'artist')
      ?.map(r => r.attributes?.name)
      ?.filter(Boolean)
      ?.join(', ') || 'Unknown';
  }, [selectedManga]);

  const magazine = useMemo(() => {
    if (!selectedManga) return 'Unknown';
    return selectedManga.relationships
      ?.find(r => r.type === 'serialization')
      ?.attributes?.name || 'Unknown';
  }, [selectedManga]);

  // Format pseudo or real ratings & followers
  const ratingScore = useMemo(() => {
    if (statistics?.rating?.average) {
      return statistics.rating.average.toFixed(2);
    }
    if (!selectedManga) return '7.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.1 + Math.abs(hashVal % 23) / 10;
    return score.toFixed(2);
  }, [selectedManga, statistics]);

  const reviewScore = useMemo(() => {
    if (statistics?.rating?.bayesian) {
      return statistics.rating.bayesian.toFixed(2);
    }
    if (!selectedManga) return '8.50';
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const score = 7.5 + Math.abs(hashVal % 21) / 10;
    return score.toFixed(2);
  }, [selectedManga, statistics]);

  const reviewCount = useMemo(() => {
    if (statistics?.follows) {
      return Math.max(15, Math.round(statistics.follows * 0.05));
    }
    if (!selectedManga) return 100;
    let hashVal = 0;
    const idStr = selectedManga.id;
    for (let i = 0; i < idStr.length; i++) {
      hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    return 45 + Math.abs(hashVal % 450);
  }, [selectedManga, statistics]);

  const formatFollowers = (val: number) => {
    if (statistics?.follows) {
      val = statistics.follows;
    }
    if (!selectedManga) return '0';
    if (!val) {
      let hashVal = 0;
      const idStr = selectedManga.id;
      for (let i = 0; i < idStr.length; i++) {
        hashVal = idStr.charCodeAt(i) + ((hashVal << 5) - hashVal);
      }
      val = 12000 + Math.abs(hashVal % 158000);
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toString();
  };

  const externalLinks = useMemo(() => {
    if (!selectedManga) return [];
    const links = selectedManga.attributes.links;
    if (!links) return [];
    const result = [];
    if (links.mal) result.push({ name: 'MyAnimeList', url: `https://myanimelist.net/manga/${links.mal}` });
    if (links.al) result.push({ name: 'AniList', url: `https://anilist.co/manga/${links.al}` });
    if (links.mu) result.push({ name: 'MangaUpdates', url: `https://www.mangaupdates.com/series.html?id=${links.mu}` });
    if (links.ap) result.push({ name: 'Anime-Planet', url: `https://www.anime-planet.com/manga/${links.ap}` });
    if (links.raw) result.push({ name: 'Official Raw', url: links.raw });
    if (links.eng) result.push({ name: 'Official English', url: links.eng });
    return result;
  }, [selectedManga]);

  const mangaStudios = useMemo(() => {
    if (!aniListMangaData?.relations?.edges) return [];
    const studiosMap = new Map<number, { id: number; name: string }>();
    aniListMangaData.relations.edges.forEach((edge: any) => {
      if (edge.node?.type === 'ANIME' && edge.node?.studios?.edges) {
        edge.node.studios.edges.forEach((stEdge: any) => {
          if (stEdge.node) {
            studiosMap.set(stEdge.node.id, stEdge.node);
          }
        });
      }
    });
    return Array.from(studiosMap.values());
  }, [aniListMangaData]);

  const nextAiringEpisodeData = useMemo(() => {
    if (aniListMangaData?.nextAiringEpisode) {
      return aniListMangaData.nextAiringEpisode;
    }
    if (aniListMangaData?.relations?.edges) {
      const animeRelation = aniListMangaData.relations.edges.find((edge: any) => edge.node?.type === 'ANIME' && edge.node?.nextAiringEpisode);
      if (animeRelation) {
        return animeRelation.node.nextAiringEpisode;
      }
    }
  }, [aniListMangaData]);

  const mangaStaffList = useMemo(() => {
    if (!aniListMangaData?.staff?.edges) return [];
    return aniListMangaData.staff.edges.filter((edge: any) => edge.node);
  }, [aniListMangaData]);

  // Mapped chapters from MangaPill
  const mappedMangapillChapters = useMemo(() => {
    if (readingSource === 'mangadex') return [];
    return mangapillChapters.map((ch: any) => {
      return {
        id: ch.id,
        attributes: {
          chapter: ch.chapterNumber?.toString() || ch.chapter || ch.title?.match(/Chapter\s+([\d.]+)/i)?.[1] || '',
          title: ch.title || '',
          pages: 0,
          publishAt: ch.releaseDate || ch.released || ch.releasedDate || ch.date || ''
        }
      };
    });
  }, [mangapillChapters, readingSource]);

  // Chapter filter/sort memo
  const filteredAndSortedChapters = useMemo(() => {
    let result = readingSource !== 'mangadex' ? [...mappedMangapillChapters] : [...chapters];
    if (chapterFilter.trim()) {
      const q = chapterFilter.toLowerCase();
      result = result.filter(ch =>
        (ch.attributes.chapter && ch.attributes.chapter.toLowerCase().includes(q)) ||
        (ch.attributes.title && ch.attributes.title.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      const numA = parseFloat(a.attributes.chapter || '0');
      const numB = parseFloat(b.attributes.chapter || '0');
      if (isNaN(numA) || isNaN(numB)) {
        return chapterSort === 'asc'
          ? (a.attributes.chapter || '').localeCompare(b.attributes.chapter || '')
          : (b.attributes.chapter || '').localeCompare(a.attributes.chapter || '');
      }
      return chapterSort === 'asc' ? numA - numB : numB - numA;
    });
    return result;
  }, [chapters, mappedMangapillChapters, readingSource, chapterFilter, chapterSort]);

  const formatChapterDate = (dateStr: string) => {
    if (!dateStr) return 'Recent';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recent';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return diffMins <= 1 ? '1 minute ago' : `${diffMins} minutes ago`;
      }
      if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      }
      if (diffDays < 30) {
        return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const activeReaderChapters = useMemo(() => {
    let result = readingSource !== 'mangadex' ? [...mappedMangapillChapters] : [...chapters];
    result.sort((a, b) => {
      const numA = parseFloat(a.attributes.chapter || '0');
      const numB = parseFloat(b.attributes.chapter || '0');
      if (isNaN(numA) || isNaN(numB)) {
        return (b.attributes.chapter || '').localeCompare(a.attributes.chapter || '');
      }
      return numB - numA;
    });
    return result;
  }, [chapters, mappedMangapillChapters, readingSource]);

  const sidebarChapterOptions = useMemo(() => {
    return activeReaderChapters.map((ch) => {
      const num = ch?.attributes?.chapter || 'Oneshot';
      const title = ch?.attributes?.title;
      return {
        value: ch.id,
        label: `Ch ${num}${title ? ` - ${title}` : ''}`,
        triggerLabel: `Ch ${num}${title ? `: ${title.substring(0, 16)}${title.length > 16 ? '...' : ''}` : ''}`
      };
    });
  }, [activeReaderChapters]);

  const menuChapterOptions = useMemo(() => {
    return activeReaderChapters.map((ch) => {
      const num = ch?.attributes?.chapter || 'Oneshot';
      const title = ch?.attributes?.title;
      return {
        value: ch.id,
        label: `Ch ${num}${title ? ` - ${title}` : ''}`,
        triggerLabel: `Ch ${num}`
      };
    });
  }, [activeReaderChapters]);

  // Premium Character Details Page layout (Early Return)
  if (selectedCharacterId) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans animate-fade-in text-left">
        {/* Navigation Bar / Header */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => setSelectedCharacterId(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider active:scale-95 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Character Profile</span>
        </div>

        {characterDetailsLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 gap-3 text-zinc-400 min-h-[60vh]">
            <Loader2 className="animate-spin text-red-600" size={36} />
            <span className="text-xs font-semibold tracking-wider">Loading character dossiers...</span>
          </div>
        ) : characterDetailsError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 text-center text-zinc-400 gap-2 min-h-[60vh]">
            <AlertCircle size={40} className="text-red-500" />
            <h3 className="text-lg font-bold text-white">Failed to load character details</h3>
            <p className="text-xs text-zinc-500 max-w-sm">{characterDetailsError}</p>
            <button
              onClick={() => setSelectedCharacterId(selectedCharacterId)}
              className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Retry
            </button>
          </div>
        ) : characterDetails ? (
          <div className="max-w-7xl mx-auto px-4 md:px-12 py-10 flex flex-col md:flex-row gap-10 text-left">
            {/* Left column: Image & Stats */}
            <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start font-sans">
              <div className="w-[200px] md:w-full aspect-[2/3] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 group hover:scale-[1.01] transition-transform duration-500">
                <img
                  src={characterDetails.image?.large}
                  alt={characterDetails.name?.full}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stats card */}
              <div className="w-full mt-8 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-6 space-y-4 text-xs shadow-lg">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Profile Dossier</h4>
                {characterDetails.gender && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Gender</span>
                    <span className="text-zinc-300 text-sm font-medium">{characterDetails.gender}</span>
                  </div>
                )}
                {characterDetails.age && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Age</span>
                    <span className="text-zinc-300 text-sm font-medium">{characterDetails.age}</span>
                  </div>
                )}
                {(characterDetails.dateOfBirth?.day || characterDetails.dateOfBirth?.month) && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Birthday</span>
                    <span className="text-zinc-300 text-sm font-medium font-sans">
                      {characterDetails.dateOfBirth.month ? new Date(2000, characterDetails.dateOfBirth.month - 1).toLocaleString('en-US', { month: 'long' }) : ''} {characterDetails.dateOfBirth.day || ''}
                      {characterDetails.dateOfBirth.year ? `, ${characterDetails.dateOfBirth.year}` : ''}
                    </span>
                  </div>
                )}
                {characterDetails.bloodType && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Blood Type</span>
                    <span className="text-zinc-300 text-sm font-medium">{characterDetails.bloodType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Bio & Other Works */}
            <div className="flex-1 min-w-0 flex flex-col font-sans space-y-10">
              <div className="space-y-6">
                {/* Character Names */}
                <div>
                  <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none mb-2">
                    {characterDetails.name?.full}
                  </h1>
                  {characterDetails.name?.native && (
                    <h3 className="text-xl font-bold text-red-500 mt-1">
                      {characterDetails.name.native}
                    </h3>
                  )}
                  {(characterDetails.name?.alternative?.length > 0 || characterDetails.name?.alternativeSpoiler?.length > 0) && (
                    <p className="text-xs text-zinc-500 mt-2">
                      <span className="font-semibold text-zinc-400">Alternative Names:</span> {[...(characterDetails.name.alternative || []), ...(characterDetails.name.alternativeSpoiler || [])].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Biography */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">Biography</h3>
                  <div className="text-gray-300 leading-relaxed text-base font-light whitespace-pre-line bg-white/[0.01] p-6 rounded-2xl border border-white/[0.03] shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                    {characterDetails.description || 'No biography available for this character.'}
                  </div>
                </div>
              </div>

              {/* Appears In Manga Section */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2 flex items-center gap-2">
                  <BookOpen size={16} className="text-red-500" />
                  <span>Appears In ({characterModalMediaManga.length})</span>
                </h3>

                {characterModalMediaLoading ? (
                  <div className="flex items-center gap-2 py-8">
                    <Loader2 className="animate-spin text-red-500" size={20} />
                    <span className="text-xs text-zinc-500 font-medium">Mapping appearances to catalog...</span>
                  </div>
                ) : characterModalMediaManga.length === 0 ? (
                  <p className="text-zinc-500 italic py-2 text-sm">No other mapped manga entries available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                    {characterModalMediaManga.map((manga) => {
                      const title = getMangaTitleHelper(manga, titleLanguage);
                      const coverFileName = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
                      const coverUrl = coverFileName?.startsWith('http')
                        ? coverFileName
                        : (coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` : 'https://placehold.co/400x600/111/444?text=No+Cover');
                      return (
                        <div
                          key={manga.id}
                          onClick={() => {
                            handleMangaSelect(manga.id, title);
                            setSelectedCharacterId(null);
                          }}
                          className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:scale-[1.02] transition-all duration-300 shadow-lg"
                        >
                          <img
                            src={coverUrl}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 p-3 flex flex-col justify-end text-left pointer-events-none">
                            <h5 className="text-[11px] font-bold text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                              {title}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Premium Staff Details Page layout (Early Return)
  if (selectedStaffId) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans animate-fade-in text-left">
        {/* Navigation Bar / Header */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => setSelectedStaffId(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider active:scale-95 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Creator Profile</span>
        </div>

        {staffDetailsLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 gap-3 text-zinc-400 min-h-[60vh]">
            <Loader2 className="animate-spin text-red-600" size={36} />
            <span className="text-xs font-semibold tracking-wider">Retrieving creator dossiers...</span>
          </div>
        ) : staffDetailsError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 text-center text-zinc-400 gap-2 min-h-[60vh]">
            <AlertCircle size={40} className="text-red-500" />
            <h3 className="text-lg font-bold text-white">Failed to load creator details</h3>
            <p className="text-xs text-zinc-500 max-w-sm">{staffDetailsError}</p>
            <button
              onClick={() => setSelectedStaffId(selectedStaffId)}
              className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Retry
            </button>
          </div>
        ) : staffDetails ? (
          <div className="max-w-7xl mx-auto px-4 md:px-12 py-10 flex flex-col md:flex-row gap-10 text-left">
            {/* Left column: Image & Stats */}
            <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start font-sans">
              <div className="w-[200px] md:w-full aspect-[2/3] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 group hover:scale-[1.01] transition-transform duration-500">
                <img
                  src={staffDetails.image?.large}
                  alt={staffDetails.name?.full}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stats card */}
              <div className="w-full mt-8 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl p-6 space-y-4 text-xs shadow-lg font-sans">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Creator Dossier</h4>
                {staffDetails.homeTown && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Hometown</span>
                    <span className="text-zinc-300 text-sm font-medium">{staffDetails.homeTown}</span>
                  </div>
                )}
                {staffDetails.language && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Language</span>
                    <span className="text-zinc-300 text-sm font-medium">{staffDetails.language}</span>
                  </div>
                )}
                {(staffDetails.dateOfBirth?.day || staffDetails.dateOfBirth?.month || staffDetails.dateOfBirth?.year) && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Birth Date</span>
                    <span className="text-zinc-300 text-sm font-medium">
                      {staffDetails.dateOfBirth.month ? new Date(2000, staffDetails.dateOfBirth.month - 1).toLocaleString('en-US', { month: 'long' }) : ''} {staffDetails.dateOfBirth.day || ''}
                      {staffDetails.dateOfBirth.year ? `, ${staffDetails.dateOfBirth.year}` : ''}
                    </span>
                  </div>
                )}
                {(staffDetails.dateOfDeath?.day || staffDetails.dateOfDeath?.month || staffDetails.dateOfDeath?.year) && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Date of Death</span>
                    <span className="text-zinc-300 text-sm font-medium">
                      {staffDetails.dateOfDeath.month ? new Date(2000, staffDetails.dateOfDeath.month - 1).toLocaleString('en-US', { month: 'long' }) : ''} {staffDetails.dateOfDeath.day || ''}
                      {staffDetails.dateOfDeath.year ? `, ${staffDetails.dateOfDeath.year}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Bio & Other Works */}
            <div className="flex-1 min-w-0 flex flex-col font-sans space-y-10">
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none mb-2">
                    {staffDetails.name?.full}
                  </h1>
                  {staffDetails.name?.native && (
                    <h3 className="text-xl font-bold text-red-500 mt-1">
                      {staffDetails.name.native}
                    </h3>
                  )}
                  {staffDetails.name?.alternative?.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-2">
                      <span className="font-semibold text-zinc-400">Alternative Names:</span> {staffDetails.name.alternative.filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Biography */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">Biography</h3>
                  <div
                    className="text-gray-300 leading-relaxed text-base font-light whitespace-pre-line bg-white/[0.01] p-6 rounded-2xl border border-white/[0.03] shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar text-left"
                    dangerouslySetInnerHTML={{ __html: staffDetails.description || 'No biography available for this creator.' }}
                  />
                </div>
              </div>

              {/* Works Grid */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2 flex items-center gap-2">
                  <BookOpen size={16} className="text-red-500" />
                  <span>Works ({staffMedia.length})</span>
                </h3>

                {staffMediaLoading ? (
                  <div className="flex items-center gap-2 py-8">
                    <Loader2 className="animate-spin text-red-500" size={20} />
                    <span className="text-xs text-zinc-500 font-medium">Mapping credits to catalog...</span>
                  </div>
                ) : staffMedia.length === 0 ? (
                  <p className="text-zinc-500 italic py-2 text-sm">No mapped works catalog entries available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                    {staffMedia.map((manga) => {
                      const title = getMangaTitleHelper(manga, titleLanguage);
                      const coverFileName = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
                      const coverUrl = coverFileName?.startsWith('http')
                        ? coverFileName
                        : (coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` : 'https://placehold.co/400x600/111/444?text=No+Cover');
                      return (
                        <div
                          key={manga.id}
                          onClick={() => {
                            handleMangaSelect(manga.id, title);
                            setSelectedStaffId(null);
                          }}
                          className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:scale-[1.02] transition-all duration-300 shadow-lg"
                        >
                          <img
                            src={coverUrl}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 p-3 flex flex-col justify-end text-left pointer-events-none">
                            <h5 className="text-[11px] font-bold text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                              {title}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Premium Studio Details Page layout (Early Return)
  if (selectedStudioId) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans animate-fade-in text-left">
        {/* Navigation Bar / Header */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => setSelectedStudioId(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all text-xs font-bold uppercase tracking-wider active:scale-95 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Studio Profile</span>
        </div>

        {studioDetailsLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 gap-3 text-zinc-400 min-h-[60vh]">
            <Loader2 className="animate-spin text-red-600" size={36} />
            <span className="text-xs font-semibold tracking-wider">Retrieving studio details...</span>
          </div>
        ) : studioDetailsError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-24 text-center text-zinc-400 gap-2 min-h-[60vh]">
            <AlertCircle size={40} className="text-red-500" />
            <h3 className="text-lg font-bold text-white">Failed to load studio details</h3>
            <p className="text-xs text-zinc-500 max-w-sm">{studioDetailsError}</p>
            <button
              onClick={() => setSelectedStudioId(selectedStudioId)}
              className="mt-4 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Retry
            </button>
          </div>
        ) : studioDetails ? (
          <div className="max-w-7xl mx-auto px-4 md:px-12 py-10 flex flex-col gap-10 text-left">
            {/* Studio Header block */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none">
                {studioDetails.name}
              </h1>
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full font-bold uppercase text-red-500 flex items-center gap-1.5 shadow">
                  <Heart size={11} className="fill-red-500" /> {studioDetails.favourites || 0} Favorites
                </span>
                <span className="text-zinc-600">|</span>
                <span>Produced Works: {studioMedia.length}</span>
              </div>
            </div>

            {/* Produced Works Grid */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2 flex items-center gap-2">
                <BookOpen size={18} className="text-red-500" />
                <span>Produced Adaptations & Works ({studioMedia.length})</span>
              </h3>

              {studioMediaLoading ? (
                <div className="flex items-center gap-2 py-8">
                  <Loader2 className="animate-spin text-red-500" size={20} />
                  <span className="text-xs text-zinc-500 font-medium">Mapping credits to catalog...</span>
                </div>
              ) : studioMedia.length === 0 ? (
                <p className="text-zinc-500 italic py-2 text-sm">No mapped works catalog entries available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                  {studioMedia.map((manga) => {
                    const title = getMangaTitleHelper(manga, titleLanguage);
                    const coverFileName = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
                    const coverUrl = coverFileName?.startsWith('http')
                      ? coverFileName
                      : (coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` : 'https://placehold.co/400x600/111/444?text=No+Cover');
                    return (
                      <div
                        key={manga.id}
                        onClick={() => {
                          handleMangaSelect(manga.id, title);
                          setSelectedStudioId(null);
                        }}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:scale-[1.02] transition-all duration-300 shadow-lg"
                      >
                        <img
                          src={coverUrl}
                          alt={title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 p-3 flex flex-col justify-end text-left pointer-events-none">
                          <h5 className="text-[11px] font-bold text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                            {title}
                          </h5>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Reader overlay active checks
  if (activeChapter) {
    const currentChapterIdx = activeReaderChapters.findIndex(ch => ch.id === activeChapter.id);
    const hasPrevChapter = currentChapterIdx < activeReaderChapters.length - 1; // older chapter (at higher index)
    const hasNextChapter = currentChapterIdx > 0; // newer chapter (at lower index)

    const goToPrevChapter = () => {
      if (hasPrevChapter) {
        onChapterSelect(activeReaderChapters[currentChapterIdx + 1].id);
      }
    };

    const goToNextChapter = () => {
      if (hasNextChapter) {
        onChapterSelect(activeReaderChapters[currentChapterIdx - 1].id);
      }
    };

    const getBgClass = () => {
      if (readerBg === 'gray') return 'bg-zinc-900';
      if (readerBg === 'darker') return 'bg-[#030303]';
      return 'bg-black';
    };

    const getPageWidthClass = () => {
      if (pageSize === 'wide') return 'max-w-4xl';
      if (pageSize === 'full') return 'max-w-full px-4';
      return 'max-w-2xl';
    };

    const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChapterSelect(e.target.value);
    };



    const handleReaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const currentScrollTop = scrollTop;

      const isAtBottom = scrollHeight - currentScrollTop - clientHeight < 80;
      const isAtTop = currentScrollTop < 20;
      const isScrollingUp = currentScrollTop < lastScrollTopRef.current;

      if (isAtTop) {
        setShowTopBar(true);
        setShowBottomBar(false);
      } else if (isAtBottom) {
        setShowTopBar(false);
        setShowBottomBar(true);
      } else {
        setShowBottomBar(false);
        if (isScrollingUp) {
          setShowTopBar(true);
        } else {
          setShowTopBar(false);
        }
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    const SidebarContent = () => (
      <div className="w-full h-full flex flex-col justify-between text-left p-5 space-y-6 overflow-y-auto custom-scrollbar select-none text-zinc-300">

        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-red-600 rounded-full inline-block"></span>
              <span className="text-[10px] font-medium text-zinc-400 tracking-wider">Manga Reader</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>

          <div>
            <span className="text-[10px] font-medium text-zinc-400 tracking-wide">You are reading</span>
            <h3 className="text-sm font-medium text-white line-clamp-2 mt-1 flex items-center gap-1.5">
              {selectedManga ? getMangaTitle(selectedManga) : 'Loading...'}
              <Info
                size={14}
                className="text-zinc-500 hover:text-white cursor-pointer shrink-0"
                onClick={handleCloseReader}
                title="View Manga details"
              />
            </h3>
            <p className="text-[11px] text-zinc-400 font-normal mt-1 flex items-center gap-1.5">
              <Globe size={11} className="text-red-500" />
              <span>Language: {LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}</span>
            </p>
          </div>
        </div>

        {/* Navigation panel */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="w-1 h-3 bg-red-600 rounded-full inline-block"></span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Navigation</span>
          </div>

          {/* Chapter selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Select Chapter</span>
              <span className="text-[10px] font-medium text-zinc-400">
                {currentChapterIdx !== -1 ? `${activeReaderChapters.length - currentChapterIdx} / ${activeReaderChapters.length}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevChapter}
                disabled={!hasPrevChapter}
                className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Older Chapter"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex-1 relative">
                <CustomSelect
                  value={activeChapter.id}
                  onChange={onChapterSelect}
                  options={sidebarChapterOptions}
                  className="px-2.5 py-2 hover:bg-zinc-900 font-medium text-xs border-white/5 rounded-lg border"
                  dropdownClassName="w-64 max-h-60"
                  menuAlign="left"
                />
              </div>

              <button
                onClick={goToNextChapter}
                disabled={!hasNextChapter}
                className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                title="Newer Chapter"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Page selector (if single or double mode) */}
          {(readerMode === 'single' || readerMode === 'double') && pages.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium text-zinc-400 tracking-wide">Select Page</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={activePageIdx === 0}
                  className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex-1 relative">
                  <CustomSelect
                    value={String(activePageIdx)}
                    onChange={(val) => setActivePageIdx(parseInt(val, 10))}
                    options={pageOptions}
                    className="px-2.5 py-2 hover:bg-zinc-900 font-normal text-xs border-white/5 rounded-lg border"
                    dropdownClassName="w-full max-h-60"
                    menuAlign="left"
                  />
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={
                    readerMode === 'double'
                      ? activePageIdx >= pages.length - 1
                      : activePageIdx === pages.length - 1
                  }
                  className="p-2 rounded-lg bg-white/5 hover:bg-zinc-800 disabled:opacity-20 text-white transition-all active:scale-95 shrink-0"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4.5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="w-1 h-3 bg-red-600 rounded-full inline-block"></span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-300">↑/↓</span>
              <span>Scroll</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-300">←/→</span>
              <span>Pages</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-300">Esc</span>
              <span>Exit Reader</span>
            </div>
            {readerMode === 'strip' && (
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-mono text-zinc-300">A</span>
                <span>Toggle Autoscroll</span>
              </div>
            )}
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="w-1 h-3 bg-red-600 rounded-full inline-block"></span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Layout Settings</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400">View Mode</span>
              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                <button
                  onClick={() => setReaderMode('strip')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${readerMode === 'strip' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Strip
                </button>
                <button
                  onClick={() => setReaderMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${readerMode === 'single' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Single
                </button>
                <button
                  onClick={() => {
                    setReaderMode('double');
                    if (activePageIdx > 0 && activePageIdx % 2 === 0) {
                      setActivePageIdx(activePageIdx - 1);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${readerMode === 'double' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  Book
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400 font-sans">Data Saver</span>
              <button
                onClick={() => setIsDataSaver(!isDataSaver)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-normal transition-all ${isDataSaver ? 'bg-red-600/20 text-red-400' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                {isDataSaver ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400">Page Width</span>
              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                {(['normal', 'wide', 'full'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`px-2 py-1 rounded-md text-[9px] font-normal capitalize transition-all ${pageSize === sz ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-normal text-zinc-400 font-sans">Theme</span>
              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                {(['black', 'gray', 'darker'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setReaderBg(bg)}
                    className={`px-2 py-1 rounded-md text-[9px] font-normal capitalize transition-all ${readerBg === bg ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {bg === 'darker' ? 'V2' : bg}
                  </button>
                ))}
              </div>
            </div>

            {readerMode === 'strip' && (
              <div className="flex items-center justify-between">
                <span className="font-normal text-zinc-400">Autoscroll</span>
                <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                  {([0, 1, 2, 3] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setAutoScrollSpeed(spd)}
                      className={`px-2 py-1 rounded-md text-[9px] font-normal transition-all ${autoScrollSpeed === spd ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {spd === 0 ? 'Off' : spd === 1 ? 'Slow' : spd === 2 ? 'Med' : 'Fast'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5 text-[9px] font-normal text-zinc-500 tracking-wider">
          MovieVerse Reader v2.0
        </div>
      </div>
    );

    const formatInfo = selectedManga ? getMangaFormat(selectedManga) : null;
    const isStitchedFormat = formatInfo?.label === 'Manhwa' || formatInfo?.label === 'Manhua';

    const HorizontalMenuBar = ({ isBottom = false }: { isBottom?: boolean }) => {
      const barClass = isBottom
        ? `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${(showBottomBar && readerMode !== 'double') ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        } w-[92vw] max-w-5xl`
        : `fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showTopBar && isMenuVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
        } w-[92vw] max-w-5xl`;

      return (
        <div
          className={`${barClass} bg-zinc-950/65 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 font-sans text-xs text-zinc-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-md transition-all active:scale-[0.99] select-none`}
        >
          {/* Left section: Manga Title & Back button */}
          <div className="flex items-center gap-2">
            {!isBottom && (
              <button
                onClick={handleCloseReader}
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="Back to Manga Details"
              >
                <ChevronLeft size={15} />
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl font-bold text-white max-w-[140px] sm:max-w-[240px] truncate">
              <BookOpen size={14} className="text-red-500 shrink-0" />
              <span className="truncate">{selectedManga ? getMangaTitle(selectedManga) : 'Loading...'}</span>
            </div>
          </div>

          {/* Center section: Chapter Selector */}
          <CustomSelect
            value={activeChapter.id}
            onChange={onChapterSelect}
            options={menuChapterOptions}
            icon={<LayoutList size={14} className="text-red-500 shrink-0" />}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border-white/5 rounded-xl font-semibold border text-xs"
            containerClassName="w-40 sm:w-56"
            dropdownClassName="w-56 max-h-60"
            menuAlign="center"
          />

          {/* Right section: Navigation & Settings */}
          <div className="flex items-center gap-2">
            {/* PREV button */}
            <button
              onClick={goToPrevChapter}
              disabled={!hasPrevChapter}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-20 text-white rounded-xl transition-all font-bold active:scale-95 text-[10px] tracking-wider uppercase shrink-0"
              title="Older Chapter"
            >
              <ChevronLeft size={13} /> PREV
            </button>

            {/* NEXT button */}
            <button
              onClick={goToNextChapter}
              disabled={!hasNextChapter}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-20 text-white rounded-xl transition-all font-bold active:scale-95 text-[10px] tracking-wider uppercase shrink-0"
              title="Newer Chapter"
            >
              NEXT <ChevronRight size={13} />
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => showToast("Added to reading list")}
              className="hidden sm:inline-flex p-2 bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl transition-all active:scale-95 shrink-0"
              title="Bookmark Chapter"
            >
              <Bookmark size={14} />
            </button>

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl transition-all active:scale-95 shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>



            {/* Settings toggler (only at top) */}
            {!isBottom && (
              <button
                onClick={() => setIsReaderSettingsOpen(prev => !prev)}
                className={`p-2 border rounded-xl transition-all active:scale-95 shrink-0 ${isReaderSettingsOpen ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/35' : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300'}`}
                title="Settings & Info"
              >
                <Settings size={14} />
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className={`fixed inset-0 z-[120] ${getBgClass()} flex flex-col font-sans select-none ${isReaderExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>

        {/* Top Horizontal Floating Menu Bar */}
        <HorizontalMenuBar />

        {/* Bottom Horizontal Floating Menu Bar */}
        <HorizontalMenuBar isBottom={true} />

        {/* Main Reader Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Reader Body container */}
          <div
            ref={readerScrollContainerRef}
            onScroll={handleReaderScroll}
            className="flex-1 overflow-y-auto custom-scrollbar pt-20 pb-4 px-4 relative flex flex-col items-center justify-start"
          >
            {pagesLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-red-600" size={36} />
                <span className="text-xs text-zinc-400 font-medium tracking-wider">Streaming pages...</span>
              </div>
            ) : pages.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <AlertCircle size={40} className="text-red-500 animate-pulse" />
                <span className="text-xs text-zinc-400">Failed to stream pages for this chapter. Please retry.</span>
              </div>
            ) : readerMode === 'strip' ? (
              /* Long Strip Mode (Stacked scroll) */
              <div className={`${getPageWidthClass()} w-full flex flex-col ${isStitchedFormat ? 'gap-0 py-0' : 'gap-2 py-1'}`}>
                {pages.map((page, i) => {
                  const isGiga = readingSource === 'gigaviewer';
                  const url = typeof page === 'string' ? page : page.src;
                  return (
                    <div key={i} className={`w-full relative overflow-hidden ${isStitchedFormat ? 'bg-transparent rounded-none min-h-0' : 'bg-zinc-950/20 rounded-xl shadow-lg min-h-0'}`}>
                      {isGiga ? (
                        <GigaViewerPage page={page} pageNum={i + 1} />
                      ) : (
                        <img
                          src={url}
                          alt={`Page ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-auto block pointer-events-none"
                          loading="lazy"
                          onError={(e) => {
                            if (readingSource !== 'mangadex') return;
                            const target = e.currentTarget;
                            if (!target.src.includes('uploads.mangadex.org')) {
                              try {
                                const parsedUrl = new URL(target.src);
                                target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                              } catch (err) {
                                console.error('Failed to resolve fallback URL:', err);
                              }
                            }
                          }}
                        />
                    )}
                    {!isStitchedFormat && (
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] text-zinc-300 select-none font-medium shadow-md">
                        {i + 1} / {pages.length}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ) : readerMode === 'single' ? (
              /* Single Page Mode (Slideshow) */
              <div className="flex-1 w-full flex flex-col justify-center items-center py-2 h-full">
                <div className={`w-full ${getPageWidthClass()} flex items-center justify-between gap-2 sm:gap-6 h-full`}>

                  <button
                    onClick={handlePrevPage}
                    disabled={activePageIdx === 0}
                    className="p-2 sm:p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white disabled:opacity-10 disabled:pointer-events-none transition-all active:scale-90 shadow-lg border border-white/5 shrink-0"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="flex-1 aspect-[3/4] max-h-[76vh] md:max-h-[80vh] bg-zinc-950/20 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-2xl">
                    {readingSource === 'gigaviewer' ? (
                      <GigaViewerPage key={activePageIdx} page={pages[activePageIdx]} pageNum={activePageIdx + 1} className="max-h-full max-w-full object-contain pointer-events-none animate-fade-in duration-300" />
                    ) : (
                      <img
                        key={activePageIdx}
                        src={pages[activePageIdx]}
                        alt={`Page ${activePageIdx + 1}`}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain pointer-events-none animate-fade-in duration-300"
                        onError={(e) => {
                          if (readingSource !== 'mangadex') return;
                          const target = e.currentTarget;
                          if (!target.src.includes('uploads.mangadex.org')) {
                            try {
                              const parsedUrl = new URL(target.src);
                              target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                            } catch (err) {
                              console.error('Failed to resolve fallback URL:', err);
                            }
                          }
                        }}
                      />
                    )}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-3.5 py-1 rounded-full text-xs text-white select-none font-medium shadow-xl">
                      {activePageIdx + 1} / {pages.length}
                    </div>
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={activePageIdx === pages.length - 1}
                    className="p-2 sm:p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white disabled:opacity-10 disabled:pointer-events-none transition-all active:scale-90 shadow-lg border border-white/5"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ) : (
              /* Double Page Mode (Book style) */
              <div className="flex-1 w-full flex flex-col justify-center items-center py-4 h-full relative" style={{ perspective: '1500px' }}>
                <style dangerouslySetInnerHTML={{
                  __html: `
                  .manga-book-container {
                    display: flex;
                    position: relative;
                    width: 100%;
                    max-width: 1000px;
                    aspect-ratio: 4 / 3;
                    max-h: 68vh;
                    margin-top: 24px;
                    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.85);
                    border-radius: 12px;
                    background: #111;
                    padding: 8px;
                    border: 4px solid #27272a;
                  }
                  .manga-book-page {
                    flex: 1;
                    height: 100%;
                    background: #09090b;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.95);
                    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease;
                  }
                  .manga-book-page-left {
                    border-top-left-radius: 6px;
                    border-bottom-left-radius: 6px;
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    transform-origin: right center;
                  }
                  .manga-book-page-right {
                    border-top-right-radius: 6px;
                    border-bottom-right-radius: 6px;
                    border-left: 1px solid rgba(255, 255, 255, 0.05);
                    transform-origin: left center;
                  }
                  .manga-book-spine {
                    position: absolute;
                    left: 50%;
                    top: 8px;
                    bottom: 8px;
                    width: 16px;
                    transform: translateX(-50%);
                    z-index: 40;
                    background: linear-gradient(90deg, 
                      rgba(0,0,0,0.5) 0%, 
                      rgba(0,0,0,0.85) 45%, 
                      rgba(0,0,0,0.95) 50%, 
                      rgba(0,0,0,0.85) 55%, 
                      rgba(0,0,0,0.5) 100%
                    );
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    pointer-events: none;
                  }
                  .manga-page-img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    pointer-events: none;
                  }
                  /* 3D Paper fold transitions */
                  .flip-next-right {
                    transform: rotateY(-15deg) translateX(-10px) scale(0.98);
                    opacity: 0.85;
                  }
                  .flip-next-left {
                    transform: rotateY(15deg) translateX(10px) scale(0.98);
                    opacity: 0.85;
                  }
                  .flip-prev-right {
                    transform: rotateY(-15deg) translateX(-10px) scale(0.98);
                    opacity: 0.85;
                  }
                  .flip-prev-left {
                    transform: rotateY(15deg) translateX(10px) scale(0.98);
                    opacity: 0.85;
                  }
                  /* Crease shadow effect overlay */
                  .manga-page-gradient-left {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, rgba(0,0,0,0) 80%, rgba(0,0,0,0.3) 100%);
                    pointer-events: none;
                    z-index: 10;
                  }
                  .manga-page-gradient-right {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(-90deg, rgba(0,0,0,0) 80%, rgba(0,0,0,0.3) 100%);
                    pointer-events: none;
                    z-index: 10;
                  }
                  /* Swipe lighting flare simulating page movement */
                  .sweep-shadow {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 50%;
                    z-index: 50;
                    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0) 100%);
                    pointer-events: none;
                    transform: translateX(100%);
                  }
                  .sweep-shadow-active-next {
                    animation: sweepAnimationNext 0.6s ease-in-out forwards;
                  }
                  .sweep-shadow-active-prev {
                    animation: sweepAnimationPrev 0.6s ease-in-out forwards;
                  }
                  @keyframes sweepAnimationNext {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                  }
                  @keyframes sweepAnimationPrev {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                ` }} />

                <div className="w-full max-w-5xl flex items-center justify-between gap-4 h-full">
                  {/* Left Nav Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={activePageIdx === 0}
                    className="p-3.5 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white disabled:opacity-5 disabled:pointer-events-none transition-all active:scale-90 shadow-2xl border border-white/10 shrink-0 z-50 hover:scale-105"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  {/* 3D Book Frame */}
                  <div className="flex-1 flex justify-center items-center relative py-2">
                    <div className="manga-book-container">
                      {/* Sweep Shadow Effect */}
                      {isFlipping && (
                        <div
                          className={`sweep-shadow ${flipDirection === 'next'
                              ? 'sweep-shadow-active-next'
                              : 'sweep-shadow-active-prev'
                            }`}
                        />
                      )}

                      {/* Middle Spine crease */}
                      <div className="manga-book-spine" />

                      {/* Left Page (higher index, i.e., activePageIdx + 1 for manga RTL) */}
                      {activePageIdx === 0 ? (
                        /* Leather inside cover for page 0 spread */
                        <div className="manga-book-page manga-book-page-left bg-zinc-950/95 shadow-inner">
                          <div className="flex flex-col items-center gap-3 select-none opacity-40">
                            <BookOpen size={48} className="text-zinc-600" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">MovieVerse Book Mode</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`manga-book-page manga-book-page-left ${isFlipping && flipDirection === 'next' ? 'flip-next-left' : isFlipping && flipDirection === 'prev' ? 'flip-prev-left' : ''
                            }`}
                        >
                          <div className="manga-page-gradient-left" />
                          {activePageIdx + 1 < pages.length ? (
                            readingSource === 'gigaviewer' ? (
                              <GigaViewerPage page={pages[activePageIdx + 1]} pageNum={activePageIdx + 2} className="manga-page-img" />
                            ) : (
                              <img
                                src={pages[activePageIdx + 1]}
                                alt={`Page ${activePageIdx + 2}`}
                                referrerPolicy="no-referrer"
                                className="manga-page-img"
                                onError={(e) => {
                                  if (readingSource !== 'mangadex') return;
                                  const target = e.currentTarget;
                                  if (!target.src.includes('uploads.mangadex.org')) {
                                    try {
                                      const parsedUrl = new URL(target.src);
                                      target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                                    } catch (err) {
                                      console.error('Failed to resolve fallback URL:', err);
                                    }
                                  }
                                }}
                              />
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-2 select-none opacity-20">
                              <BookOpen size={36} className="text-zinc-700" />
                              <span className="text-[10px] font-semibold text-zinc-600 tracking-wider">End of Chapter</span>
                            </div>
                          )}
                          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-zinc-400 font-semibold border border-white/5 shadow-md">
                            {activePageIdx + 2} / {pages.length}
                          </div>
                        </div>
                      )}

                      {/* Right Page (lower index, activePageIdx) */}
                      <div
                        className={`manga-book-page manga-book-page-right ${isFlipping && flipDirection === 'next' ? 'flip-next-right' : isFlipping && flipDirection === 'prev' ? 'flip-prev-right' : ''
                          }`}
                      >
                        <div className="manga-page-gradient-right" />
                        {readingSource === 'gigaviewer' ? (
                          <GigaViewerPage page={pages[activePageIdx]} pageNum={activePageIdx + 1} className="manga-page-img" />
                        ) : (
                          <img
                            src={pages[activePageIdx]}
                            alt={`Page ${activePageIdx + 1}`}
                            referrerPolicy="no-referrer"
                            className="manga-page-img"
                            onError={(e) => {
                              if (readingSource !== 'mangadex') return;
                              const target = e.currentTarget;
                              if (!target.src.includes('uploads.mangadex.org')) {
                                try {
                                  const parsedUrl = new URL(target.src);
                                  target.src = `https://uploads.mangadex.org${parsedUrl.pathname}`;
                                } catch (err) {
                                  console.error('Failed to resolve fallback URL:', err);
                                }
                              }
                            }}
                          />
                        )}
                        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-zinc-400 font-semibold border border-white/5 shadow-md">
                          {activePageIdx + 1} / {pages.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Nav Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={activePageIdx >= pages.length - 1}
                    className="p-3.5 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white disabled:opacity-5 disabled:pointer-events-none transition-all active:scale-90 shadow-2xl border border-white/10 shrink-0 z-50 hover:scale-105"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slide-out Settings Drawer (Desktop + Mobile Overlay) */}
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-all duration-300 ease-in-out"
          style={{
            zIndex: 140,
            opacity: isReaderSettingsOpen ? 1 : 0,
            visibility: isReaderSettingsOpen ? 'visible' : 'hidden',
            pointerEvents: isReaderSettingsOpen ? 'auto' : 'none'
          }}
        >
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setIsReaderSettingsOpen(false)} />
          <div
            className="absolute right-0 top-0 bottom-0 w-80 border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
            style={{
              backgroundColor: '#0c0c0e',
              transform: isReaderSettingsOpen ? 'translateX(0)' : 'translateX(100%)'
            }}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-red-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Settings & Info</span>
              </div>
              <button
                onClick={() => setIsReaderSettingsOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {SidebarContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Premium Details Screen active checks
  if (selectedMangaId && !selectedManga) {
    return (
      <div className="min-h-screen bg-[#030303] text-white pb-16 animate-fade-in font-sans">
        {/* Backdrop Banner skeleton */}
        <div className="relative w-full h-[14vh] md:h-[18vh] bg-zinc-950/20 shimmer-bg" />

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 flex flex-col md:flex-row gap-8 text-left">
          {/* Left cover block */}
          <div className="w-[180px] md:w-[280px] shrink-0">
            <div className="w-[180px] md:w-full aspect-[2/3] shimmer-bg rounded-xl" />
            <div className="w-full h-10 shimmer-bg rounded-lg mt-5" />
          </div>
          {/* Right details block */}
          <div className="flex-1 space-y-6">
            <div className="h-10 w-2/3 shimmer-bg rounded-lg" />
            <div className="h-4 w-1/2 shimmer-bg rounded-lg" />
            <div className="flex gap-3">
              <div className="h-8 w-24 shimmer-bg rounded-md" />
              <div className="h-8 w-32 shimmer-bg rounded-md" />
              <div className="h-8 w-20 shimmer-bg rounded-md" />
            </div>
            <div className="space-y-2.5 pt-4">
              <div className="h-4 w-full shimmer-bg rounded-lg" />
              <div className="h-4 w-full shimmer-bg rounded-lg" />
              <div className="h-4 w-3/4 shimmer-bg rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Premium Details Screen active checks
  if (selectedManga) {
    return (
      <div className={`min-h-screen bg-[#030303] text-white pb-16 relative select-none font-sans ${isDetailsExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>

        {/* Backdrop Hero Banner */}
        <div className="relative w-full h-[14vh] md:h-[18vh] overflow-hidden select-none">
          <img
            src={getMangaCover(selectedManga)}
            alt={getMangaTitle(selectedManga)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-15 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />

          <button
            onClick={handleCloseDetails}
            className="absolute top-4 left-4 md:left-12 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] text-xs font-normal text-zinc-300 hover:text-white transition-all active:scale-95 z-30"
          >
            <ArrowLeft size={14} /> Back to Manga
          </button>
        </div>

        {/* Main Grid Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 flex flex-col md:flex-row gap-8 pb-16 text-left">

          {/* Left Column - Side Cover Card & Specs */}
          <div className="w-full md:w-[280px] shrink-0 flex flex-col items-center md:items-start">
            <div className="w-[180px] md:w-full aspect-[2/3] bg-zinc-900 rounded-xl overflow-hidden shadow-lg relative">
              <img
                src={getMangaCover(selectedManga)}
                alt={getMangaTitle(selectedManga)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {chapters.length > 0 && (
              <button
                onClick={() => onChapterSelect(chapters[0].id)}
                className="w-full mt-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 hover:scale-[1.01] active:scale-98 text-xs tracking-wide"
              >
                <BookOpen size={16} /> First Chapter
              </button>
            )}

            {/* Technical metadata card */}
            <div className="w-full mt-6 bg-[#0c0c0e]/80 border border-white/5 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-400 tracking-wider">Information</h4>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Author</span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {selectedManga.relationships
                      ?.filter(r => r.type === 'author')
                      ?.map(r => {
                        const authorName = r.attributes?.name;
                        if (!authorName) return null;
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleStaffSearchAndSelect(authorName)}
                            className="text-red-500 hover:text-red-400 font-medium underline text-left hover:no-underline transition-all"
                          >
                            {authorName}
                          </button>
                        );
                      })}
                    {selectedManga.relationships?.filter(r => r.type === 'author').length === 0 && (
                      <span className="text-zinc-300 font-medium">Unknown</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Artist</span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {selectedManga.relationships
                      ?.filter(r => r.type === 'artist')
                      ?.map(r => {
                        const artistName = r.attributes?.name;
                        if (!artistName) return null;
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleStaffSearchAndSelect(artistName)}
                            className="text-red-500 hover:text-red-400 font-medium underline text-left hover:no-underline transition-all"
                          >
                            {artistName}
                          </button>
                        );
                      })}
                    {selectedManga.relationships?.filter(r => r.type === 'artist').length === 0 && (
                      <span className="text-zinc-300 font-medium">Unknown</span>
                    )}
                  </div>
                </div>
                {mangaStudios.length > 0 && (
                  <div>
                    <span className="text-zinc-500 font-normal block mb-0.5">Animation Studio</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5 font-sans">
                      {mangaStudios.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setSelectedStudioId(st.id)}
                          className="text-red-500 hover:text-red-400 font-medium underline text-left hover:no-underline transition-all"
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Published</span>
                  <span className="text-zinc-300 font-medium">{selectedManga.attributes.year || 'TBA'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Demographic</span>
                  <span className="text-zinc-300 font-medium capitalize">{selectedManga.attributes.publicationDemographic || 'General'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Serialization</span>
                  <span className="text-zinc-300 font-medium">{magazine}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Status</span>
                  <span className="text-zinc-300 font-medium capitalize">{selectedManga.attributes.status}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-normal block mb-0.5">Format</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${getMangaFormat(selectedManga).badgeClass}`}>
                    {getMangaFormat(selectedManga).label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Main Info Description Tabs */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
              {getMangaTitle(selectedManga)}
            </h1>

            {/* Quick Metrics Badge row */}
            <div className="flex flex-wrap gap-2 mb-6 text-left">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getMangaFormat(selectedManga).badgeClass}`}>
                {getMangaFormat(selectedManga).label}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5" title="MAL Rating">
                ⭐ {ratingScore} MAL
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5" title="Reviews Score">
                🏆 {reviewScore} / 10 ({reviewCount} reviews)
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1.5">
                <Users size={12} className="text-zinc-500" /> {formatFollowers(selectedManga.attributes.relevance || 0)} Followers
              </span>
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 capitalize">
                {selectedManga.attributes.contentRating}
              </span>
            </div>

            {/* Airing Anime Countdown Card */}
            {nextAiringEpisodeData && (
              <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs tracking-wider uppercase">
                    <Calendar size={14} className="animate-pulse" />
                    <span>Anime Adaptation Airing</span>
                  </div>
                  <h4 className="text-base font-extrabold text-white leading-tight">
                    Episode {nextAiringEpisodeData.episode} Countdown
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Airs on {new Date(nextAiringEpisodeData.airingAt * 1000).toLocaleString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="bg-red-500/10 border border-red-500/25 px-5 py-3 rounded-xl text-left sm:text-right font-sans shrink-0 w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-red-400 uppercase block tracking-wider mb-0.5">Airing In</span>
                  <span className="text-base font-black text-white font-mono">
                    {Math.floor(nextAiringEpisodeData.timeUntilAiring / 86400)}d {Math.floor((nextAiringEpisodeData.timeUntilAiring % 86400) / 3600)}h {Math.floor((nextAiringEpisodeData.timeUntilAiring % 3600) / 60)}m
                  </span>
                </div>
              </div>
            )}

            {/* Synopsis */}
            <div className="mb-8 text-left">
              <h3 className="text-xl font-bold text-white mb-4">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed text-base font-light">
                {cleanDescription(selectedManga.attributes.description?.en || null)}
              </p>
            </div>

            {/* Genres & Tags */}
            <div className="mb-8 text-left">
              <h3 className="text-xl font-bold text-white mb-4">Genres & Themes</h3>
              <div className="flex flex-wrap gap-2">
                {selectedManga.attributes.tags?.map((t: any) => (
                  <span
                    key={t.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 transition-colors cursor-default"
                  >
                    {t.attributes.name.en}
                  </span>
                ))}
              </div>
            </div>

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="mb-10 text-left">
                <h3 className="text-xl font-bold text-white mb-4">Official & Database Links</h3>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                    >
                      <Globe size={13} className="text-zinc-500" /> {link.name}
                    </a>
                  ))}
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
              <button
                onClick={() => setDetailsTab('staff')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'staff' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Staff
                {detailsTab === 'staff' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('reviews')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'reviews' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Reviews
                {detailsTab === 'reviews' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
              <button
                onClick={() => setDetailsTab('social')}
                className={`pb-2 text-xs md:text-sm font-medium tracking-wide relative transition-colors ${detailsTab === 'social' ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
              >
                Social
                {detailsTab === 'social' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-full" />}
              </button>
            </div>

            {/* Tab Contents */}
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
                    {/* Native (Japanese) GigaViewer Switch Toggle */}
                    <div className="flex items-center gap-2 bg-transparent border-none px-0 py-1.5 shrink-0">
                      <span className="text-[10px] font-medium text-zinc-400">Raw (日本語)</span>
                      <button
                        onClick={() => setUseNativeGigaViewer(prev => !prev)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useNativeGigaViewer ? 'bg-red-600' : 'bg-zinc-800'}`}
                      >
                        <span
                           className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useNativeGigaViewer ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Source / Host Selector */}
                    {useNativeGigaViewer ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Host</span>
                        <CustomSelect
                          value={gigaViewerHost}
                          onChange={setGigaViewerHost}
                          options={[
                            { value: 'shonenjumpplus.com', label: 'Shonen Jump+' },
                            { value: 'comic-days.com', label: 'Comic Days' },
                            { value: 'kuragebunch.com', label: 'Kurage Bunch' },
                            { value: 'tonarinoyj.jp', label: 'となりのヤングジャンプ' },
                            { value: 'www.sunday-webry.com', label: 'Sunday Webry' },
                            { value: 'comic-walker.com', label: 'KadoComi (ComicWalker)' }
                          ]}
                          className="px-3 py-1.5 hover:bg-zinc-800 text-xs font-medium border-white/5 rounded-lg border shrink-0 w-full"
                          containerClassName="w-44"
                          dropdownClassName="w-44 max-h-60"
                          menuAlign="right"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Source</span>
                        <CustomSelect
                          value={readingSource}
                          onChange={setReadingSource}
                          options={sourceOptions}
                          className="px-3 py-1.5 hover:bg-zinc-800 text-xs font-medium border-white/5 rounded-lg border shrink-0 w-full"
                          containerClassName="w-44"
                          dropdownClassName="w-44 max-h-60"
                          menuAlign="right"
                        />
                      </div>
                    )}

                    {/* Language Picker */}
                    {!useNativeGigaViewer && readingSource === 'mangadex' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-zinc-500">Language</span>
                        <CustomSelect
                          value={selectedLanguage}
                          onChange={setSelectedLanguage}
                          options={languageOptions}
                          className="px-3 py-1.5 hover:bg-zinc-800 text-xs font-medium border-white/5 rounded-lg border shrink-0 w-full"
                          containerClassName="w-36"
                          dropdownClassName="w-36 max-h-60"
                          menuAlign="right"
                        />
                      </div>
                    )}

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

                {/* GigaViewer Mapping Fallback UI */}
                {useNativeGigaViewer && isResolvingGigaViewer && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 bg-[#0c0c0e]/50 border border-white/5 rounded-xl">
                    <Loader2 className="animate-spin text-red-500" size={20} />
                    <span className="text-[10px] text-zinc-500 font-medium">Resolving GigaViewer mapping...</span>
                  </div>
                )}

                {useNativeGigaViewer && !isResolvingGigaViewer && !resolvedGigaViewerUrl && !pastedGigaViewerUrl && (
                  <div className="bg-[#0c0c0e]/50 border border-white/5 rounded-xl p-5 text-center space-y-3">
                    <AlertCircle className="text-zinc-500 mx-auto" size={24} />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">Could not find official Japanese source automatically</h4>
                      <p className="text-[10px] text-zinc-500">Please paste a GigaViewer chapter/episode URL directly below to read.</p>
                    </div>
                    <div className="flex gap-2 max-w-md mx-auto">
                      <input
                        type="text"
                        placeholder="e.g., https://shonenjumpplus.com/episode/..."
                        value={pastedGigaViewerUrl}
                        onChange={(e) => setPastedGigaViewerUrl(e.target.value)}
                        className="flex-1 bg-black text-xs text-white border border-white/5 hover:border-white/10 focus:border-red-600 rounded-lg px-3 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Chapters List */}
                {readingSource !== 'mangadex' && mangapillError && !isAutoResolving ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                    <AlertCircle size={28} className="text-red-500/80 mb-1" />
                    <span className="text-xs font-medium">{mangapillError}</span>
                    <button
                      onClick={() => selectedManga && resolveMangaPill(selectedManga, readingSource)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                    >
                      <RefreshCcw size={11} /> Retry
                    </button>
                  </div>
                ) : (chaptersLoading || (readingSource !== 'mangadex' && mangapillLoading) || isAutoResolving) ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                      {isAutoResolving
                        ? 'Auto-detecting best source for latest chapters...'
                        : (readingSource !== 'mangadex' ? `Resolving ${readingSource} source...` : 'Loading chapters...')}
                    </span>
                  </div>
                ) : filteredAndSortedChapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-50 text-center">
                    <AlertCircle size={28} className="text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500">
                      {readingSource !== 'mangadex'
                        ? `No chapters found on ${readingSource}.`
                        : `No chapters found matching filter in ${LANGUAGE_NAMES[selectedLanguage] || selectedLanguage}.`}
                    </span>
                    {readingSource === 'mangadex' && (
                      <span className="text-[10px] text-zinc-600 font-medium mt-1 block">
                        Try selecting another language from the dropdown.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAndSortedChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => onChapterSelect(ch.id)}
                        className="p-4 rounded-xl bg-white/[0.02] hover:bg-red-600/[0.04] text-left text-xs transition-all flex items-center justify-between group active:scale-99 border border-white/[0.03] hover:border-red-600/20"
                      >
                        <div className="space-y-1">
                          <span className="text-white font-medium text-sm block group-hover:text-red-500 transition-colors">
                            Chapter {ch.attributes.chapter || 'Oneshot'}
                          </span>
                          {ch.attributes.title && (
                            <span className="text-zinc-400 font-normal block truncate max-w-[200px] sm:max-w-[260px]">
                              {ch.attributes.title}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-zinc-500 font-normal block mb-1">
                            {formatChapterDate(ch.attributes.publishAt)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-medium text-zinc-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-colors">
                            Read
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Relations Tab */}
            {detailsTab === 'relations' && (
              relationsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Finding related works...</span>
                </div>
              ) : relations.filter(r => r.relationships?.some((x: any) => x.type === 'manga')).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <LayoutList size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No related works available for this manga.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {relations.map((rel) => {
                    const relatedManga = rel.relationships?.find((r: any) => r.type === 'manga');
                    if (!relatedManga) return null;
                    const relationType = RELATION_NAMES[rel.attributes?.relation] || rel.attributes?.relation || 'Related';
                    return (
                      <div
                        key={rel.id}
                        onClick={() => handleMangaSelect(relatedManga.id)}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
                      >
                        <img
                          src={getMangaCover(relatedManga)}
                          alt={getMangaTitle(relatedManga)}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Relation Type Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-sm shadow">
                            {relationType}
                          </span>
                        </div>

                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {getMangaTitle(relatedManga)}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Recommendations Tab */}
            {detailsTab === 'recommendations' && (
              recLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Finding recommendations...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Sparkles size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No similar manga recommendations available.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {recommendations.map((recManga) => (
                    <div
                      key={recManga.id}
                      onClick={() => handleMangaSelect(recManga.id)}
                      className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
                    >
                      <img
                        src={getMangaCover(recManga)}
                        alt={getMangaTitle(recManga)}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                        <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                          {getMangaTitle(recManga)}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Characters Tab */}
            {detailsTab === 'characters' && (
              charactersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Summoning characters...</span>
                </div>
              ) : charactersError && characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                  <AlertCircle size={28} className="text-red-500/80 mb-1" />
                  <span className="text-xs font-medium">Failed to retrieve characters.</span>
                  <button
                    onClick={() => selectedManga && fetchMangaCharacters(selectedManga)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-bold text-white transition-all flex items-center gap-2"
                  >
                    <RefreshCcw size={11} /> Retry
                  </button>
                </div>
              ) : characters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Users size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No characters data found for this manga.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {characters.map((edge: any) => {
                    const charNode = edge.node;
                    const charName = charNode.name.userPreferred || charNode.name.full;
                    const charImage = charNode.image.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=333&color=fff`;
                    const charRole = edge.role === 'MAIN' ? 'Main' : 'Supporting';

                    return (
                      <div
                        key={charNode.id}
                        onClick={() => setSelectedCharacterId(charNode.id)}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
                      >
                        <img
                          src={charImage}
                          alt={charName}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Role Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${edge.role === 'MAIN' ? 'bg-red-600/90 text-white' : 'bg-zinc-800/90 text-zinc-300'} backdrop-blur-sm shadow`}>
                            {charRole}
                          </span>
                        </div>

                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {charName}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Staff Tab */}
            {detailsTab === 'staff' && (
              aniListMangaLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Retrieving staff members...</span>
                </div>
              ) : mangaStaffList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <Users size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No staff details available for this manga.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {mangaStaffList.map((edge: any) => {
                    const staffNode = edge.node;
                    const staffName = staffNode.name.full;
                    const staffImage = staffNode.image.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=333&color=fff`;
                    const staffRole = edge.role || 'Staff';

                    return (
                      <div
                        key={staffNode.id}
                        onClick={() => setSelectedStaffId(staffNode.id)}
                        className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500 animate-in fade-in zoom-in-95 duration-300"
                      >
                        <img
                          src={staffImage}
                          alt={staffName}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Role Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-600/95 text-white backdrop-blur-sm shadow">
                            {staffRole}
                          </span>
                        </div>

                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end text-left select-none pointer-events-none">
                          <h4 className="text-[11px] font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                            {staffName}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Reviews Tab */}
            {detailsTab === 'reviews' && (
              reviewsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="animate-spin text-red-500" size={24} />
                  <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Retrieving community reviews...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-50">
                  <FileText size={28} className="text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-500">No community reviews available for this manga.</span>
                </div>
              ) : (
                <div className="space-y-6 text-left">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition-colors shadow-lg"
                    >
                      {/* Review Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.user?.avatar?.medium || 'https://ui-avatars.com/api/?name=User&background=333&color=fff'}
                            alt={rev.user?.name}
                            className="w-10 h-10 rounded-full border border-white/10"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-white">{rev.user?.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase mt-0.5">AniList Contributor</p>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="flex items-center gap-3 text-xs bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold text-white">{rev.score}%</span>
                          </div>
                          <span className="text-zinc-600">|</span>
                          <span className="text-zinc-400 font-medium">{rev.rating} Likes</span>
                        </div>
                      </div>

                      {/* Review Content */}
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-red-500 leading-snug">
                          {rev.summary}
                        </h3>
                        <div className="text-zinc-300 text-sm font-normal leading-relaxed max-h-[160px] overflow-y-auto pr-2 custom-scrollbar whitespace-pre-line bg-white/[0.01] p-3 rounded-lg border border-white/[0.02]">
                          {rev.body.replace(/<br>/gi, '\n')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Social Tab */}
            {detailsTab === 'social' && (
              <div className="space-y-6 text-left animate-in fade-in">
                {/* Create Post Form */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-md">
                  <h4 className="font-bold text-xs sm:text-sm text-white mb-3">Discuss this Manga</h4>
                  <textarea
                    rows={3}
                    value={socialPostText}
                    onChange={(e) => setSocialPostText(e.target.value)}
                    placeholder="Write your thoughts or questions about this manga..."
                    className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none custom-scrollbar font-normal"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSocialPostSubmit}
                      disabled={!socialPostText.trim()}
                      className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      <span>Post Discussion</span>
                    </button>
                  </div>
                </div>

                {/* Activities list */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-xs sm:text-sm text-zinc-300 border-b border-white/5 pb-2 uppercase tracking-wider">Community Feed</h4>
                  {socialActivitiesLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <Loader2 className="animate-spin text-red-500" size={16} />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fetching discussion feed...</span>
                    </div>
                  ) : combinedSocialActivities.length === 0 ? (
                    <p className="text-zinc-500 text-xs italic py-6">No discussions about this manga yet. Be the first to share your thoughts!</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {combinedSocialActivities.map((act) => {
                        const isText = act.type === 'TEXT';
                        const actionText = isText ? act.text : `${act.status.toLowerCase().replace('_', ' ')} ${act.progress ? `${act.progress} of` : ''}`;
                        return (
                          <div key={act.id} className="bg-white/5 p-4 rounded-xl border border-white/5 text-left flex flex-col justify-between h-full">
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <img
                                  src={act.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.user?.name || 'User')}&background=333&color=fff`}
                                  className="w-8 h-8 rounded-lg object-cover"
                                  alt=""
                                />
                                <div>
                                  <h5 className="font-bold text-xs text-white leading-tight">{act.user?.name}</h5>
                                  <p className="text-[8px] text-gray-500">{new Date(act.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                {act.isLocal && (
                                  <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] bg-red-600/10 border border-red-500/20 text-red-500 uppercase font-semibold">Local</span>
                                )}
                              </div>
                              <p className="text-gray-300 text-xs leading-relaxed line-clamp-4 font-normal whitespace-pre-line break-words">
                                {isText ? act.text : actionText}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 pt-3.5 mt-4 border-t border-white/5 text-[10px] text-gray-500 font-semibold">
                              <span>❤️ {act.likeCount || 0} Likes</span>
                              <span>💬 {act.replyCount || 0} Comments</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recommendations list */}
                {socialRecommendations.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="font-semibold text-xs sm:text-sm text-zinc-300 uppercase tracking-wider">Fans Also Recommended</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                      {socialRecommendations.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => {
                            if (node.mediaRecommendation?.id) {
                              const recTitle = node.mediaRecommendation.title?.english || node.mediaRecommendation.title?.userPreferred || "";
                              handleMangaSelect(`anilist-${node.mediaRecommendation.id}`, recTitle);
                            }
                          }}
                          className="cursor-pointer group/rec"
                        >
                          <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/rec:border-white/20 transition-all mb-1 shadow">
                            <img src={node.mediaRecommendation?.coverImage?.large} className="w-full h-full object-cover group-hover/rec:scale-102 transition-transform animate-none" alt="" />
                          </div>
                          <h5 className="font-medium text-[10px] text-gray-400 group-hover/rec:text-white transition-colors line-clamp-2 leading-tight">
                            {node.mediaRecommendation?.title?.english || node.mediaRecommendation?.title?.userPreferred}
                          </h5>
                          <span className="text-[8px] text-zinc-600 font-bold">★ {node.rating} rating</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#030303] text-white pb-16 relative ${disableEntryAnimation ? 'disable-animations' : ''}`}>

      {/* 1. Spotlight Hero Banner */}
      {!searchQuery && trending[heroIndex] && (
        <div className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden group mb-10 border-b border-white/5 select-none">
          <div className="absolute inset-0">
            <img
              src={getMangaCover(trending[heroIndex])}
              alt={getMangaTitle(trending[heroIndex])}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102 opacity-70 blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/40 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 flex flex-col items-start gap-3.5 md:max-w-4xl animate-in slide-in-from-bottom-8 duration-700">
            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center gap-1.5">
              <Sparkles size={11} fill="currentColor" /> Spotlight Manga
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-2xl text-left">
              {getMangaTitle(trending[heroIndex])}
            </h1>

            <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-gray-300">
              <span className="text-red-500 font-extrabold flex items-center gap-1 text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">
                {trending[heroIndex].attributes.status}
              </span>
              {trending[heroIndex].attributes.year && (
                <>
                  <span>•</span>
                  <span>{trending[heroIndex].attributes.year} Year</span>
                </>
              )}
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[9px] tracking-wider font-extrabold uppercase">
                {trending[heroIndex].attributes.contentRating}
              </span>
            </div>

            <p className="text-gray-300 text-xs md:text-sm line-clamp-3 max-w-2xl leading-relaxed text-left font-medium drop-shadow-md">
              {cleanDescription(trending[heroIndex].attributes.description?.en || null)}
            </p>

            <div className="flex flex-row items-center gap-3 w-full sm:w-auto mt-2">
              <TvFocusButton
                onClick={() => handleMangaSelect(trending[heroIndex].id)}
                className="flex-1 sm:flex-none px-6 py-2.5 text-sm sm:text-base rounded-md font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
              >
                <BookOpen size={18} /> Read Now
              </TvFocusButton>
            </div>
          </div>

          <div className="absolute right-6 bottom-12 z-30 flex flex-col gap-2">
            {[...Array(Math.min(trending.length, 5))].map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === i ? 'bg-red-600 h-6' : 'bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Manga List Categories or Search Results */}
      {searchQuery ? (
        <div className="px-4 md:px-12 max-w-7xl mx-auto text-left pt-20 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); if (onSearchClear) onSearchClear(); }}
              className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ChevronLeft size={13} /> Back to Catalog
            </button>
          </div>

          {searchLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Searching database...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <BookOpen size={48} className="text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Manga Found</h3>
              <p className="text-zinc-500 text-xs md:text-sm max-w-sm">No titles matched your query. Please check for spelling mistakes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {searchResults.map((manga) => (
                <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaSelect} titleLanguage={titleLanguage} />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        // Loading skeletons
        <div className="space-y-12 py-10 px-4 md:px-12 select-none">
          {[...Array(3)].map((_, rIdx) => (
            <div key={rIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="h-5 w-48 bg-zinc-800 rounded-full animate-pulse"></div>
              </div>
              <div className="flex gap-5 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[140px] sm:w-[170px] shrink-0 aspect-[2/3] bg-zinc-900 border border-white/5 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto px-4">
          <AlertCircle size={48} className="text-red-500 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to load Manga catalog</h3>
          <p className="text-zinc-500 text-xs leading-relaxed mb-6">{error}</p>
          <button
            onClick={loadMangaCatalog}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-all active:scale-95"
          >
            <RefreshCcw size={14} /> Retry Loading
          </button>
        </div>
      ) : (
        // Category rows
        <div className="space-y-4">

          {/* Section Header with Language Selector Dropdown */}
          <div className="flex items-center justify-between px-4 md:px-12 py-4 border-b border-white/5 mb-6 select-none">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 text-left">
                <span className="w-2.5 h-6 rounded-full bg-red-600"></span>
                Manga Catalog
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* NSFW Content Toggle Button */}
              <button
                onClick={() => setIncludeNsfw(prev => !prev)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg backdrop-blur-md ${includeNsfw
                    ? 'bg-red-600/20 border-red-500/40 text-red-400 hover:bg-red-600/30'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:bg-white/10'
                  }`}
                title="Toggle Explicit/NSFW content"
              >
                <AlertTriangle size={14} className={includeNsfw ? 'text-red-400 animate-pulse' : 'text-zinc-500'} />
                <span>NSFW Content</span>
              </button>

              <div className="relative group shrink-0">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-full text-xs font-bold text-gray-200 transition-all active:scale-95 min-w-[130px] justify-between shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-center gap-2">
                    <Languages size={14} className="text-red-500" />
                    <span>{titleLanguage === 'english' ? 'English' : titleLanguage === 'romaji' ? 'Romaji' : 'Native'}</span>
                  </div>
                  <ChevronDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>
                {isLangDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-40 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all origin-top-right z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {[
                        { value: 'english', label: 'English' },
                        { value: 'romaji', label: 'Romaji' },
                        { value: 'native', label: 'Native' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setTitleLanguage(opt.value as any);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-between ${titleLanguage === opt.value
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                              : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          {opt.label}
                          {titleLanguage === opt.value && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {anilistPlanning.length > 0 && (
            <MangaRow title="Your AniList Manga Watchlist" items={anilistPlanning} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Your AniList Manga Watchlist", items: anilistPlanning })} />
          )}

          {malPlanning.length > 0 && (
            <MangaRow title="Your MyAnimeList Manga Watchlist" items={malPlanning} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Your MyAnimeList Manga Watchlist", items: malPlanning })} />
          )}

          {missedMangaSequels.length > 0 && (
            <MangaRow title="Missed Sequels & Next Seasons" items={missedMangaSequels} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Missed Sequels & Next Seasons", items: missedMangaSequels })} />
          )}

          <MangaRow title="Trending Manga Releases" items={trending} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Trending Manga Releases", items: trending })} />
          <MangaRow title="Recently Uploaded Chapters" items={latest} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Recently Uploaded Chapters", items: latest })} />
          <MangaRow title="Most Popular Favorites" items={popular} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Most Popular Favorites", items: popular })} />
          <MangaRow title="Top Rated of All Time" items={topRated} onMangaClick={handleMangaSelect} titleLanguage={titleLanguage} onExpand={() => setExpandedCategory({ title: "Top Rated of All Time", items: topRated })} />

          {/* Endless Scroll Genre Rows */}
          {genreRows.map((row) => (
            <MangaRow
              key={row.genre}
              title={`${row.genre} Manga`}
              items={row.media}
              onMangaClick={handleMangaSelect}
              titleLanguage={titleLanguage}
              onExpand={() => setExpandedCategory({ title: `${row.genre} Manga`, items: row.media })}
            />
          ))}

          {/* Lazy Load Spinner */}
          {loadingGenreRows && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-red-600" size={20} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading more genres...</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-red-600 border border-red-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 font-sans animate-fade-in">
          {toastMessage}
        </div>
      )}
      <ExpandedCategoryModal
        isOpen={expandedCategory !== null}
        onClose={() => setExpandedCategory(null)}
        title={expandedCategory?.title || ""}
        mode="manga"
        initialItems={expandedCategory?.items || []}
        onItemClick={handleMangaSelect}
        titleLanguage={titleLanguage}
        renderItem={(item) => (
          <MangaCard
            manga={item}
            onMangaClick={handleMangaSelect}
            titleLanguage={titleLanguage}
          />
        )}
      />
    </div>
  );
};

// --- SUB COMPONENTS ---

export const getMangaFormat = (manga: MangaDexManga) => {
  const lang = manga?.attributes?.originalLanguage;
  if (lang === 'ja') {
    return {
      label: 'Manga',
      cardClass: 'bg-red-600/90 text-white border-red-500/30',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
  }
  if (lang === 'ko') {
    return {
      label: 'Manhwa',
      cardClass: 'bg-blue-600/90 text-white border-blue-500/30',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    };
  }
  if (lang === 'zh' || lang === 'zh-hk') {
    return {
      label: 'Manhua',
      cardClass: 'bg-emerald-600/90 text-white border-emerald-500/30',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    };
  }
  return {
    label: 'Comic',
    cardClass: 'bg-zinc-600/90 text-white border-zinc-500/30',
    badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  };
};

export interface MangaCardProps {
  manga: MangaDexManga;
  onMangaClick: (id: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, onMangaClick, titleLanguage }) => {
  const { ref } = useTvFocus({
    onEnterPress: () => onMangaClick(manga.id)
  });

  const title = getMangaTitleHelper(manga, titleLanguage);
  const coverFileName = manga.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
  const coverUrl = coverFileName?.startsWith('http')
    ? coverFileName
    : (coverFileName ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.256.jpg` : 'https://placehold.co/400x600/111/444?text=No+Cover');
  const formatInfo = getMangaFormat(manga);

  return (
    <div
      ref={ref}
      onClick={() => onMangaClick(manga.id)}
      className="group relative shrink-0 w-[140px] sm:w-[170px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
    >
      {/* Format Badge (Manga/Manhwa/Manhua) */}
      <div className={`absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-md ${formatInfo.cardClass}`}>
        {formatInfo.label}
      </div>

      <img
        src={coverUrl}
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Title Details Overlay */}
      <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
          {title}
        </h4>
        <div className="max-h-0 overflow-hidden group-hover:max-h-10 group-hover:mt-1 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 flex items-center justify-between text-[9px] text-zinc-400 font-semibold">
          <span>{manga.attributes.year || 'TBA'}</span>
          <span className="uppercase text-[8px] px-1 rounded bg-white/10">{manga.attributes.status}</span>
        </div>
      </div>
    </div>
  );
};

export interface MangaRowProps {
  title: string;
  items: MangaDexManga[];
  onMangaClick: (id: string) => void;
  titleLanguage: 'english' | 'romaji' | 'native';
  onExpand?: () => void;
}

export const MangaRow: React.FC<MangaRowProps> = ({ title, items, onMangaClick, titleLanguage, onExpand }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in duration-500 text-left font-sans">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 select-none">
          <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
          {title}
        </h3>
        {onExpand && (
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-white/5 hover:border-white/10 active:scale-95 shadow-md select-none"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth">
        {items.map((manga) => (
          <MangaCard key={manga.id} manga={manga} onMangaClick={onMangaClick} titleLanguage={titleLanguage} />
        ))}
      </div>
    </div>
  );
};
