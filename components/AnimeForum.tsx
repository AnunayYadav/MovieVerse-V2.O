import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, RefreshCcw, Clock, Star, ThumbsUp, Loader2, Heart, 
  MessageCircle, ChevronDown, ChevronRight, X, AlertCircle, Film,
  Users, Send, PlusCircle, Search
} from 'lucide-react';
import { TMDB_BASE_URL, tvFetch } from './Shared';
import { useTvFocus, TvFocusButton } from '../tvNavigation';
import { AniListMedia } from './AnimePage';

const fetch = tvFetch;

interface AnimeForumProps {
  apiKey: string;
  onAnimeClick: (anime: AniListMedia) => void;
  fetchAniList: (query: string, variables?: any) => Promise<any>;
  titleLanguage: 'english' | 'romaji' | 'native';
  searchQuery?: string;
  onSearchClear?: () => void;
}

export const AnimeForum: React.FC<AnimeForumProps> = ({ 
  apiKey, onAnimeClick, fetchAniList, titleLanguage, searchQuery = '', onSearchClear 
}) => {
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const toggleReviewExpand = (reviewId: number) => {
    setExpandedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  // Community discussion board state variables
  const [forumSection, setForumSection] = useState<'feed' | 'reviews' | 'recommendations' | 'users'>('feed');
  const [activities, setActivities] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Pagination for community boards
  const [feedPage, setFeedPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [recommendationsPage, setRecommendationsPage] = useState(1);

  // Comment Thread Modal details
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [activityReplies, setActivityReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // User Profile Modal details
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userProfileData, setUserProfileData] = useState<any | null>(null);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [activeUserListTab, setActiveUserListTab] = useState<string>('');

  // New Interactive states
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [localPosts, setLocalPosts] = useState<any[]>([]);
  const [localReplies, setLocalReplies] = useState<Record<number, any[]>>({});
  const [likedActivityIds, setLikedActivityIds] = useState<number[]>([]);

  // Create post states
  const [postText, setPostText] = useState('');
  const [postAnimeSearch, setPostAnimeSearch] = useState('');
  const [postAnimeResults, setPostAnimeResults] = useState<any[]>([]);
  const [postAnimeLoading, setPostAnimeLoading] = useState(false);
  const [selectedLinkAnime, setSelectedLinkAnime] = useState<any | null>(null);

  // Comment reply state
  const [newReplyText, setNewReplyText] = useState('');

  // Logged-in user profile
  const [currentUser, setCurrentUser] = useState<{ name: string; avatar?: string }>({ name: 'Guest User' });

  // Init local database
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('movieverse_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.name) {
          setCurrentUser({ name: parsed.name, avatar: parsed.avatar });
        }
      }
    } catch (e) {
      console.error("Failed to load movieverse profile:", e);
    }

    try {
      const savedLikes = localStorage.getItem('movieverse_local_likes');
      if (savedLikes) {
        setLikedActivityIds(JSON.parse(savedLikes));
      }
    } catch (e) {}

    try {
      const savedReplies = localStorage.getItem('movieverse_local_replies');
      if (savedReplies) {
        setLocalReplies(JSON.parse(savedReplies));
      }
    } catch (e) {}

    try {
      const savedPosts = localStorage.getItem('movieverse_local_posts');
      if (savedPosts) {
        setLocalPosts(JSON.parse(savedPosts));
      } else {
        const initialMockPosts = [
          {
            id: 1000001,
            userId: 999901,
            type: 'TEXT',
            text: "Just finished watching Cyberpunk: Edgerunners. The ending had me in tears... What did you guys think of David's journey?",
            replyCount: 2,
            likeCount: 24,
            createdAt: Math.floor(Date.now() / 1000 - 86400),
            user: {
              id: 999901,
              name: "AnimeFan99",
              avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeFan99" }
            },
            media: {
              id: 138474,
              title: { userPreferred: "Cyberpunk: Edgerunners", english: "Cyberpunk: Edgerunners" },
              coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx138474-0T1V2b8qZf8Z.jpg" }
            }
          },
          {
            id: 1000002,
            userId: 999902,
            type: 'TEXT',
            text: "Is anyone else following Oshi no Ko Season 2? The theater arc is being animated so beautifully, the production quality is unmatched. B小町 is back!",
            replyCount: 1,
            likeCount: 42,
            createdAt: Math.floor(Date.now() / 1000 - 43200),
            user: {
              id: 999902,
              name: "GokuSuper",
              avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=GokuSuper" }
            },
            media: {
              id: 163132,
              title: { userPreferred: "Oshi no Ko Season 2", english: "Oshi no Ko Season 2" },
              coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx163132-V2p8r0b8Zf8Z.jpg" }
            }
          },
          {
            id: 1000003,
            userId: 999903,
            type: 'TEXT',
            text: "Looking for some good psychological thriller anime recommendations. Something like Monster or Death Note. Let me know your favorites!",
            replyCount: 2,
            likeCount: 15,
            createdAt: Math.floor(Date.now() / 1000 - 7200),
            user: {
              id: 999903,
              name: "LuffyKing",
              avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=LuffyKing" }
            },
            media: null
          }
        ];
        
        const initialMockReplies: Record<number, any[]> = {
          1000001: [
            {
              id: 2000001,
              text: "It was a masterpiece. Honestly didn't expect to cry so much. The soundtrack (I Really Want to Stay at Your House) makes me emotional every time it plays.",
              likeCount: 5,
              createdAt: Math.floor(Date.now() / 1000 - 80000),
              user: { name: "LucyMoon", avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=LucyMoon" } }
            },
            {
              id: 2000002,
              text: "David went too fast... But he achieved Gloria's and Lucy's dreams. Truly a legendary anime.",
              likeCount: 2,
              createdAt: Math.floor(Date.now() / 1000 - 75000),
              user: { name: "RebeccaGun", avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=RebeccaGun" } }
            }
          ],
          1000002: [
            {
              id: 2000003,
              text: "Agreed! The opening song is also an absolute banger. Doga Kobo is flexing their animation skills this season.",
              likeCount: 8,
              createdAt: Math.floor(Date.now() / 1000 - 40000),
              user: { name: "KanaArima", avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=KanaArima" } }
            }
          ],
          1000003: [
            {
              id: 2000004,
              text: "You should definitely watch 'Pluto' on Netflix. It's by Naoki Urasawa (same creator as Monster). Incredible thriller!",
              likeCount: 6,
              createdAt: Math.floor(Date.now() / 1000 - 6000),
              user: { name: "JohanLiebert", avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=JohanLiebert" } }
            },
            {
              id: 2000005,
              text: "Also check out 'Steins;Gate' if you haven't. Starts a bit slow but the psychological drama in the second half is top-tier.",
              likeCount: 3,
              createdAt: Math.floor(Date.now() / 1000 - 5000),
              user: { name: "OkabeRintarou", avatar: { large: "https://api.dicebear.com/7.x/adventurer/svg?seed=OkabeRintarou" } }
            }
          ]
        };

        setLocalPosts(initialMockPosts);
        localStorage.setItem('movieverse_local_posts', JSON.stringify(initialMockPosts));
        setLocalReplies(initialMockReplies);
        localStorage.setItem('movieverse_local_replies', JSON.stringify(initialMockReplies));
      }
    } catch (e) {
      console.error("Failed to load local posts:", e);
    }
  }, []);

  // TMDB Matching Sync Overlay
  const [matchingStatus, setMatchingStatus] = useState<{
    isActive: boolean;
    title: string;
    error: string | null;
  }>({ isActive: false, title: '', error: null });

  const fetchCommunityData = useCallback(async () => {
    setCommunityLoading(true);
    try {
      if (forumSection === 'feed') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 20) {
              activities(type_in: [ANIME_LIST, MANGA_LIST, TEXT], sort: ID_DESC) {
                ... on ListActivity {
                  id
                  userId
                  type
                  status
                  progress
                  replyCount
                  likeCount
                  createdAt
                  media {
                    id
                    title {
                      userPreferred
                      english
                    }
                    coverImage {
                      large
                    }
                  }
                  user {
                    id
                    name
                    avatar {
                      large
                    }
                    bannerImage
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
                    id
                    name
                    avatar {
                      large
                    }
                    bannerImage
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: feedPage });
        const list = data.Page?.activities || [];
        setActivities(prev => feedPage === 1 ? list : [...prev, ...list]);
      } else if (forumSection === 'reviews') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 15) {
              reviews(sort: ID_DESC) {
                id
                summary
                body(asHtml: false)
                rating
                ratingAmount
                score
                createdAt
                media {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                user {
                  id
                  name
                  avatar {
                    large
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: reviewsPage });
        const list = data.Page?.reviews || [];
        setReviews(prev => reviewsPage === 1 ? list : [...prev, ...list]);
      } else if (forumSection === 'recommendations') {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 15) {
              recommendations(sort: ID_DESC) {
                id
                rating
                userRating
                media {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                mediaRecommendation {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
                user {
                  id
                  name
                  avatar {
                    large
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { page: recommendationsPage });
        const list = data.Page?.recommendations || [];
        setRecommendations(prev => recommendationsPage === 1 ? list : [...prev, ...list]);
      }
    } catch (err) {
      console.error("Failed to fetch community data:", err);
    } finally {
      setCommunityLoading(false);
    }
  }, [forumSection, feedPage, reviewsPage, recommendationsPage, fetchAniList]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  // Combine local posts and AniList activities
  const combinedActivities = React.useMemo(() => {
    const all = [...localPosts, ...activities];
    // Remove duplicates based on ID
    const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    return unique.sort((a, b) => b.createdAt - a.createdAt);
  }, [localPosts, activities]);

  // Search AniList users
  const handleUserSearch = (val: string) => {
    setUsersSearchQuery(val);
  };

  // Debounced search for users directory lookup
  useEffect(() => {
    if (!usersSearchQuery.trim()) {
      setSearchedUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const q = `
          query ($search: String) {
            Page(page: 1, perPage: 24) {
              users(search: $search) {
                id
                name
                about
                avatar {
                  large
                }
                bannerImage
              }
            }
          }
        `;
        const data = await fetchAniList(q, { search: usersSearchQuery });
        setSearchedUsers(data.Page?.users || []);
      } catch (e) {
        console.error("Failed to search users:", e);
      } finally {
        setUsersLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [usersSearchQuery, fetchAniList]);

  // Automatically search users if global searchQuery is provided
  useEffect(() => {
    if (searchQuery) {
      setUsersSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  // Search anime to link to post
  const handleLinkAnimeSearch = (val: string) => {
    setPostAnimeSearch(val);
  };

  // Debounced search for anime linking
  useEffect(() => {
    if (!postAnimeSearch.trim()) {
      setPostAnimeResults([]);
      setPostAnimeLoading(false);
      return;
    }

    setPostAnimeLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const q = `
          query ($search: String) {
            Page(page: 1, perPage: 5) {
              media(search: $search, type: ANIME) {
                id
                title {
                  userPreferred
                  english
                }
                coverImage {
                  large
                }
              }
            }
          }
        `;
        const data = await fetchAniList(q, { search: postAnimeSearch });
        setPostAnimeResults(data.Page?.media || []);
      } catch (e) {
        console.error("Failed to search anime for link:", e);
      } finally {
        setPostAnimeLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [postAnimeSearch, fetchAniList]);

  // Infinite Scroll Listener to automatically load next page
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 350;
      if (scrolledToBottom && !communityLoading) {
        if (forumSection === 'feed') {
          setFeedPage(prev => prev + 1);
        } else if (forumSection === 'reviews') {
          setReviewsPage(prev => prev + 1);
        } else if (forumSection === 'recommendations') {
          setRecommendationsPage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [communityLoading, forumSection]);

  // Create post
  const handleCreatePost = () => {
    if (!postText.trim()) return;

    const newPost = {
      id: Date.now(),
      userId: 999999,
      type: 'TEXT',
      text: postText,
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
      media: selectedLinkAnime ? {
        id: selectedLinkAnime.id,
        title: {
          userPreferred: selectedLinkAnime.title.userPreferred,
          english: selectedLinkAnime.title.english || selectedLinkAnime.title.userPreferred
        },
        coverImage: {
          large: selectedLinkAnime.coverImage.large
        }
      } : null,
      isLocal: true
    };

    const updated = [newPost, ...localPosts];
    setLocalPosts(updated);
    localStorage.setItem('movieverse_local_posts', JSON.stringify(updated));

    setPostText('');
    setPostAnimeSearch('');
    setPostAnimeResults([]);
    setSelectedLinkAnime(null);
  };

  // Toggle post like
  const handleLikeToggle = (activityId: number) => {
    let newLikes = [...likedActivityIds];
    const isLiked = newLikes.includes(activityId);

    if (isLiked) {
      newLikes = newLikes.filter(id => id !== activityId);
    } else {
      newLikes.push(activityId);
    }
    setLikedActivityIds(newLikes);
    localStorage.setItem('movieverse_local_likes', JSON.stringify(newLikes));

    // Update state to render immediately
    if (localPosts.some(p => p.id === activityId)) {
      setLocalPosts(prev => prev.map(p => {
        if (p.id === activityId) {
          return {
            ...p,
            likeCount: isLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1
          };
        }
        return p;
      }));
    } else {
      setActivities(prev => prev.map(act => {
        if (act.id === activityId) {
          return {
            ...act,
            likeCount: isLiked ? Math.max(0, act.likeCount - 1) : act.likeCount + 1
          };
        }
        return act;
      }));
    }
  };

  // Fetch replies (merging live and local replies)
  const fetchReplies = async (activityId: number) => {
    setRepliesLoading(true);
    try {
      let repliesFromAniList: any[] = [];
      if (activityId < 1000000) {
        const query = `
          query ($activityId: Int) {
            Page(page: 1, perPage: 25) {
              activityReplies(activityId: $activityId) {
                id
                text
                likeCount
                createdAt
                user {
                  id
                  name
                  avatar {
                    large
                  }
                }
              }
            }
          }
        `;
        const data = await fetchAniList(query, { activityId });
        repliesFromAniList = data.Page?.activityReplies || [];
      }
      
      const repliesFromLocal = localReplies[activityId] || [];
      setActivityReplies([...repliesFromAniList, ...repliesFromLocal]);
    } catch (e) {
      console.error("Failed to fetch activity replies:", e);
      setActivityReplies(localReplies[activityId] || []);
    } finally {
      setRepliesLoading(false);
    }
  };

  // Add Comment/Reply to activity/post
  const handleAddComment = () => {
    if (!newReplyText.trim() || !selectedActivity) return;

    const newReply = {
      id: Date.now(),
      text: newReplyText,
      likeCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      user: {
        id: 999999,
        name: currentUser.name,
        avatar: {
          large: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ef4444&color=fff`
        }
      },
      isLocal: true
    };

    const activityId = selectedActivity.id;
    const updatedLocalReplies = {
      ...localReplies,
      [activityId]: [...(localReplies[activityId] || []), newReply]
    };

    setLocalReplies(updatedLocalReplies);
    localStorage.setItem('movieverse_local_replies', JSON.stringify(updatedLocalReplies));

    setActivityReplies(prev => [...prev, newReply]);

    const updateReplyCount = (p: any) => {
      if (p.id === activityId) {
        return {
          ...p,
          replyCount: (p.replyCount || 0) + 1
        };
      }
      return p;
    };

    setLocalPosts(prev => prev.map(updateReplyCount));
    setActivities(prev => prev.map(updateReplyCount));
    setSelectedActivity(prev => prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : null);
    setNewReplyText('');
  };


  const fetchUserProfile = async (username: string) => {
    setUserProfileLoading(true);
    try {
      const query = `
        query ($name: String) {
          User(name: $name) {
            id
            name
            about
            avatar {
              large
            }
            bannerImage
            statistics {
              anime {
                count
                minutesWatched
                episodesWatched
              }
              manga {
                count
                chaptersRead
              }
            }
            favourites {
              anime {
                nodes {
                  id
                  title {
                    userPreferred
                    english
                  }
                  coverImage {
                    large
                  }
                }
              }
              manga {
                nodes {
                  id
                  title {
                    userPreferred
                    english
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
      const userData = await fetchAniList(query, { name: username });
      setUserProfileData(userData.User);

      if (userData.User?.id) {
        const listQuery = `
          query ($userId: Int) {
            MediaListCollection(userId: $userId, type: ANIME) {
              lists {
                name
                status
                entries {
                  id
                  status
                  media {
                    id
                    title {
                      userPreferred
                      english
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
        const listData = await fetchAniList(listQuery, { userId: userData.User.id });
        const listCol = listData.MediaListCollection?.lists || [];
        setUserLists(listCol);
        if (listCol.length > 0) {
          setActiveUserListTab(listCol[0].name);
        } else {
          setActiveUserListTab('');
        }
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setUserProfileLoading(false);
    }
  };

  const handleMediaClick = async (mediaId: number, titleInput: any) => {
    const titleObj = typeof titleInput === 'string' 
      ? { romaji: titleInput, english: titleInput, native: titleInput, userPreferred: titleInput }
      : titleInput;

    const mockMedia: AniListMedia = {
      id: mediaId,
      title: {
        romaji: titleObj?.romaji || titleObj?.userPreferred || '',
        english: titleObj?.english || titleObj?.userPreferred || '',
        native: titleObj?.native || '',
        userPreferred: titleObj?.userPreferred || ''
      },
      coverImage: {
        extraLarge: '',
        large: '',
        medium: '',
        color: ''
      },
      bannerImage: null,
      description: null,
      season: null,
      seasonYear: null,
      status: 'FINISHED',
      episodes: null,
      duration: null,
      averageScore: null,
      popularity: 0,
      genres: ['Action']
    };
    
    // Perform TMDB Matching
    const displayName = mockMedia.title.english || mockMedia.title.userPreferred;
    setMatchingStatus({ isActive: true, title: displayName, error: null });
    
    const matchCacheKey = `movieverse_anilist_tmdb_match_${mockMedia.id}`;
    const cachedMatch = localStorage.getItem(matchCacheKey);
    
    if (cachedMatch) {
      try {
        const parsed = JSON.parse(cachedMatch);
        if (parsed && parsed.id && parsed.mediaType) {
          setMatchingStatus({ isActive: false, title: '', error: null });
          onAnimeClick({
            ...mockMedia,
            id: parsed.id,
            status: parsed.mediaType === 'tv' ? 'RELEASING' : 'FINISHED',
            seasonYear: parsed.initial_season || 1
          });
          return;
        }
      } catch (_) {}
    }

    const titlesToTry: string[] = [];
    const addTitle = (t: string) => {
      if (t && typeof t === 'string' && t.trim() && !titlesToTry.includes(t)) {
        titlesToTry.push(t.trim());
      }
    };

    addTitle(mockMedia.title.english);
    addTitle(mockMedia.title.romaji);
    addTitle(mockMedia.title.userPreferred);
    addTitle(mockMedia.title.native);

    // Split by colon or dash
    const splitTitles: string[] = [];
    for (const title of [...titlesToTry]) {
      if (title.includes(':')) {
        const firstPart = title.split(':')[0].trim();
        if (firstPart.length > 2) splitTitles.push(firstPart);
      }
      if (title.includes(' - ')) {
        const firstPart = title.split(' - ')[0].trim();
        if (firstPart.length > 2) splitTitles.push(firstPart);
      }
    }
    splitTitles.forEach(addTitle);

    // Fallback: first 2 words or first word (only if long enough to prevent false positives)
    for (const title of [...titlesToTry]) {
      const words = title.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 1) {
        const firstTwo = words.slice(0, 2).join(' ');
        if (firstTwo.length > 4) addTitle(firstTwo);
        
        const firstWord = words[0].replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ヶ一-龥]/g, '');
        if (firstWord.length > 3) addTitle(firstWord);
      }
    }

    let matchedItem: any = null;
    let resolvedSeason = 1;

    for (const searchTitle of titlesToTry) {
      const cleanTitle = searchTitle.replace(/\s*\(?(Dub|Sub|TV|Movie|uncensored|censored|season\s*\d+|part\s*\d+|2nd season|3rd season|4th season|final season|the final season|final chapter|\d+(?:st|nd|rd|th)\s*(?:season|part))\)?\s*$/i, '').trim();
      const seasonMatch = searchTitle.match(/(?:season|part)\s*(\d+)/i) || searchTitle.match(/(\d+)(?:st|nd|rd|th)\s*(?:season|part)/i);
      if (seasonMatch && seasonMatch[1]) {
        resolvedSeason = parseInt(seasonMatch[1], 10);
      }

      try {
        const res = await fetch(`${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          matchedItem = data.results.find((m: any) => 
            m.genre_ids?.includes(16) && m.original_language === 'ja'
          ) || data.results.find((m: any) => 
            m.genre_ids?.includes(16)
          ) || data.results[0];
          if (matchedItem) {
            matchedItem.media_type = 'tv';
            break;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          matchedItem = data.results.find((m: any) => 
            m.genre_ids?.includes(16) && m.original_language === 'ja'
          ) || data.results.find((m: any) => 
            m.genre_ids?.includes(16)
          ) || data.results[0];
          if (matchedItem) {
            matchedItem.media_type = 'movie';
            break;
          }
        }
      } catch (_) {}
    }

    if (matchedItem) {
      setMatchingStatus({ isActive: false, title: '', error: null });
      const finalBackdrop = mockMedia.bannerImage || matchedItem.backdrop_path || mockMedia.coverImage?.large;
      localStorage.setItem(matchCacheKey, JSON.stringify({
        id: matchedItem.id,
        mediaType: matchedItem.media_type,
        backdropPath: finalBackdrop,
        initial_season: resolvedSeason
      }));

      onAnimeClick({
        ...mockMedia,
        id: matchedItem.id,
        status: matchedItem.media_type === 'tv' ? 'RELEASING' : 'FINISHED',
        seasonYear: resolvedSeason
      });
    } else {
      setMatchingStatus(prev => ({
        ...prev,
        error: `Could not link "${displayName}" to a streaming source on MovieVerse.`
      }));
    }
  };

  const formatTimeAgo = (createdAtTimestamp: number) => {
    const secs = Math.floor(Date.now() / 1000 - createdAtTimestamp);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(createdAtTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderModals = () => {
    return (
      <>
        {/* TMDB Syncing Modal Overlay */}
        {matchingStatus.isActive && (
          <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 select-none">
            <div className="bg-[#0c0c0e] border border-white/10 max-w-md w-full rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute w-24 h-24 rounded-full bg-red-600/10 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
                className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white p-1 rounded-lg transition-colors z-20 hover:bg-white/5 active:scale-95"
                title="Close Sync Overlay"
              >
                <X size={15} />
              </button>

              {matchingStatus.error ? (
                <>
                  <AlertCircle size={40} className="text-red-500 mb-4 animate-bounce" />
                  <h3 className="text-lg font-medium text-white mb-2">Syncing Failed</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed mb-6 px-4">{matchingStatus.error}</p>
                  <button
                    onClick={() => setMatchingStatus({ isActive: false, title: '', error: null })}
                    className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-2 border-red-500/20 border-t-red-600 rounded-full animate-spin flex items-center justify-center" />
                    <Film size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5">Syncing with Player</h3>
                  <p className="text-zinc-400 text-[11px] mb-4 tracking-tight px-4 leading-normal">
                    Matching <strong className="text-red-500 font-medium">"{matchingStatus.title}"</strong> with MovieVerse streaming servers.
                  </p>
                  <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em] animate-pulse">
                    Searching media databases...
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* User Profile / Favorites / Anime lists modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header Banner */}
              <div className="relative h-32 md:h-44 bg-zinc-900">
                {userProfileData?.bannerImage && (
                  <img src={userProfileData.bannerImage} className="w-full h-full object-cover opacity-45" alt="" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                <button 
                  onClick={() => { setSelectedUser(null); setUserProfileData(null); setUserLists([]); }} 
                  className="absolute top-4 right-4 z-10 p-2.5 bg-black/40 hover:bg-white/10 border border-white/5 backdrop-blur-md rounded-full text-zinc-400 hover:text-white transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Profile Info Row */}
              <div className="px-6 md:px-8 pb-4 relative z-10 -mt-10 md:-mt-16 flex flex-col md:flex-row gap-5 items-start">
                <img 
                  src={userProfileData?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser)}&background=333&color=fff`} 
                  className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-zinc-950 shadow-lg shrink-0" 
                  alt="" 
                />
                <div className="pt-2 md:pt-14 text-left">
                  <h3 className="text-xl md:text-2xl font-medium text-white leading-none">{selectedUser}</h3>
                  <p className="text-[10px] text-zinc-500 font-normal uppercase mt-1.5 tracking-wider">AniList Contributor</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-8 custom-scrollbar">
                {userProfileLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Parsing user profile...</span>
                  </div>
                ) : (
                  <>
                    {/* Bio & Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      
                      {/* Bio */}
                      <div className="md:col-span-2 text-left bg-white/5 border border-white/5 rounded-2xl p-5">
                        <h4 className="font-medium text-sm text-white mb-2.5">Bio / About</h4>
                        {userProfileData?.about ? (
                          <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line font-normal break-words">
                            {userProfileData.about.replace(/<\/?[^>]+(>|$)/g, "")}
                          </p>
                        ) : (
                          <p className="text-zinc-500 text-xs italic">No profile bio description shared.</p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="text-left bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="font-medium text-sm text-white mb-2.5">Statistics</h4>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-normal uppercase">Anime Watched</p>
                          <p className="text-lg font-semibold text-white mt-0.5">{userProfileData?.statistics?.anime?.count || 0} Shows</p>
                          <p className="text-[10px] text-zinc-500 mt-1 font-normal">{((userProfileData?.statistics?.anime?.episodesWatched || 0)).toLocaleString()} episodes</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-normal uppercase">Manga Chapters Read</p>
                          <p className="text-lg font-semibold text-white mt-0.5">{userProfileData?.statistics?.manga?.chaptersRead || 0} Chapters</p>
                        </div>
                      </div>

                    </div>

                    {/* Favorites (Anime / Manga) */}
                    {((userProfileData?.favourites?.anime?.nodes && userProfileData.favourites.anime.nodes.length > 0) || 
                      (userProfileData?.favourites?.manga?.nodes && userProfileData.favourites.manga.nodes.length > 0)) && (
                      <div className="text-left space-y-4">
                        <h4 className="font-semibold text-base text-white">Favorite Media</h4>
                        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
                          {userProfileData?.favourites?.anime?.nodes?.map((fav: any) => (
                            <div 
                              key={fav.id} 
                              onClick={() => { setSelectedUser(null); handleMediaClick(fav.id, fav.title); }}
                              className="shrink-0 w-24 cursor-pointer group/fav"
                            >
                              <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/fav:border-white/20 transition-all mb-2">
                                <img src={fav.coverImage?.large} className="w-full h-full object-cover group-hover/fav:scale-105 transition-transform" alt="" />
                              </div>
                              <h5 className="font-medium text-[10px] text-zinc-400 group-hover/fav:text-white transition-colors line-clamp-2 leading-tight">
                                {fav.title.english || fav.title.userPreferred}
                              </h5>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* List Collections */}
                    {userLists.length > 0 && (
                      <div className="text-left space-y-4">
                        <h4 className="font-semibold text-base text-white">Media List Collections</h4>
                        
                        {/* List Tab Switcher */}
                        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
                          {userLists.map((listCol: any) => (
                            <button
                              key={listCol.name}
                              onClick={() => setActiveUserListTab(listCol.name)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeUserListTab === listCol.name ? 'bg-red-600 text-white shadow-md shadow-red-600/10' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}
                            >
                              {listCol.name} ({listCol.entries?.length || 0})
                            </button>
                          ))}
                        </div>

                        {/* List Cards Scrollable grid */}
                        {userLists.map((listCol: any) => {
                          if (listCol.name !== activeUserListTab) return null;
                          const entries = listCol.entries || [];
                          if (entries.length === 0) return <p key={listCol.name} className="text-zinc-500 text-xs italic">No entries in this list.</p>;

                          return (
                            <div key={listCol.name} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pt-1 animate-in fade-in duration-300">
                              {entries.map((entry: any) => {
                                const med = entry.media;
                                if (!med) return null;
                                return (
                                  <div 
                                    key={entry.id} 
                                    onClick={() => { setSelectedUser(null); handleMediaClick(med.id, med.title); }}
                                    className="cursor-pointer group/entry text-center"
                                  >
                                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 group-hover/entry:border-white/20 transition-all mb-2 shadow-sm">
                                      <img src={med.coverImage?.large} className="w-full h-full object-cover group-hover/entry:scale-105 transition-transform" alt="" />
                                    </div>
                                    <h5 className="font-medium text-[10px] text-zinc-400 group-hover/entry:text-white transition-colors line-clamp-2 leading-tight">
                                      {med.title.english || med.title.userPreferred}
                                    </h5>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity replies / Comments modal drawer */}
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-medium text-white text-base">Activity Comments</h3>
                  <p className="text-[10px] text-zinc-500 font-normal mt-1 uppercase">Replies thread</p>
                </div>
                <button 
                  onClick={() => setSelectedActivity(null)} 
                  className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {repliesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="animate-spin text-red-500" size={24} />
                    <span className="text-[10px] text-zinc-500 font-normal uppercase tracking-wider">Fetching replies...</span>
                  </div>
                ) : activityReplies.length === 0 ? (
                  <div className="text-zinc-500 text-xs py-10 italic text-center">No replies or comments on this activity yet.</div>
                ) : (
                  <div className="space-y-4">
                    {activityReplies.map((reply) => (
                      <div key={reply.id} className="bg-white/5 p-4 border border-white/5 rounded-2xl flex gap-3 text-left">
                        <img 
                          src={reply.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user?.name || 'User')}&background=333&color=fff`} 
                          className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" 
                          alt="" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-xs text-white">{reply.user?.name}</h4>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                            <p className="text-[9px] text-zinc-500 font-normal">{formatTimeAgo(reply.createdAt)}</p>
                          </div>
                          <p className="text-zinc-300 text-xs leading-relaxed break-words font-normal whitespace-pre-line">
                            {reply.text}
                          </p>
                          <div className="mt-3 flex items-center gap-1.5 text-zinc-500">
                            <Heart size={10} className="fill-none" />
                            <span className="text-[9px] font-normal">{reply.likeCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Comment Reply Input */}
              <div className="p-4 border-t border-white/5 bg-[#0d0d0f]">
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={newReplyText} 
                    onChange={(e) => setNewReplyText(e.target.value)} 
                    placeholder="Write a comment..." 
                    className="flex-1 bg-white/5 border border-white/5 focus:border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none" 
                  />
                  <button 
                    onClick={handleAddComment} 
                    disabled={!newReplyText.trim()}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </>
    );
  };

  // Reusable cards rendering helpers
  const renderActivityCard = (act: any) => {
    const isText = act.type === 'TEXT';
    const hasMedia = act.media;
    const actionText = isText ? act.text : `${act.status.toLowerCase().replace('_', ' ')} ${act.progress ? `${act.progress} of` : ''}`;
    const isLiked = likedActivityIds.includes(act.id);
    
    return (
      <div key={act.id} className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col justify-between h-full backdrop-blur-sm group/card text-left">
        <div>
          {/* User Avatar & Info Header */}
          <div className="flex items-center gap-3.5 mb-3.5">
            <img 
              src={act.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.user?.name || 'User')}&background=333&color=fff`} 
              alt={act.user?.name}
              onClick={(e) => { e.stopPropagation(); setSelectedUser(act.user?.name); fetchUserProfile(act.user?.name); }}
              className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0" 
            />
            <div className="text-left min-w-0">
              <h4 
                onClick={(e) => { e.stopPropagation(); setSelectedUser(act.user?.name); fetchUserProfile(act.user?.name); }}
                className="font-medium text-xs sm:text-sm text-zinc-200 hover:text-red-500 transition-colors cursor-pointer truncate"
              >
                {act.user?.name}
              </h4>
              <p className="text-[10px] text-zinc-500 font-medium">{formatTimeAgo(act.createdAt)}</p>
            </div>
            {act.isLocal && (
              <span className="ml-auto px-2 py-0.5 rounded text-[8px] bg-red-600/10 border border-red-500/20 text-red-500 uppercase font-semibold">Local Post</span>
            )}
          </div>

          {/* Card Body - Content & Poster Side-by-Side */}
          <div className="flex flex-row gap-4 items-start flex-1 min-w-0 mb-4">
            <div className="flex-1 min-w-0 text-left">
              {!isText ? (
                <p className="text-zinc-300 text-xs sm:text-sm font-semibold leading-relaxed">
                  <span className="text-zinc-400 capitalize">{actionText}</span>{' '}
                  {hasMedia && (
                    <span 
                      onClick={(e) => { e.stopPropagation(); handleMediaClick(act.media.id, act.media.title); }}
                      className="text-zinc-100 hover:text-red-500 transition-colors cursor-pointer font-medium"
                    >
                      {act.media.title.english || act.media.title.userPreferred}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-line break-words line-clamp-5">
                  {act.text}
                </p>
              )}
            </div>

            {hasMedia && (
              <div 
                onClick={(e) => { e.stopPropagation(); handleMediaClick(act.media.id, act.media.title); }}
                className="shrink-0 w-16 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-md cursor-pointer hover:scale-105 transition-transform"
              >
                <img 
                  src={act.media.coverImage?.large} 
                  alt={act.media.title.userPreferred} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Likes / Comments row */}
        <div className="flex items-center gap-5 pt-3.5 border-t border-white/5 mt-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); handleLikeToggle(act.id); }}
            className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500 hover:text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Heart size={13} className={isLiked ? 'fill-current' : 'fill-none'} />
            <span className="text-[11px] font-medium">{act.likeCount || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); fetchReplies(act.id); }} 
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          >
            <MessageCircle size={13} className="fill-none" />
            <span className="text-[11px] font-medium">{act.replyCount || 0} Comments</span>
          </button>
        </div>
      </div>
    );
  };

  const renderReviewCard = (rev: any) => {
    const reviewScore = rev.score;
    const formattedScore = `${reviewScore}%`;
    const isExpanded = expandedReviews[rev.id] || false;
    
    return (
      <div 
        key={rev.id} 
        onClick={() => toggleReviewExpand(rev.id)} 
        className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start gap-6 backdrop-blur-sm cursor-pointer select-none text-left"
      >
        {/* Review Content */}
        <div className="flex-1 flex flex-col text-left min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img 
                src={rev.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.user?.name || 'User')}&background=333&color=fff`} 
                alt={rev.user?.name}
                onClick={(e) => { e.stopPropagation(); setSelectedUser(rev.user?.name); fetchUserProfile(rev.user?.name); }}
                className="w-9 h-9 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform" 
              />
              <div>
                <h4 
                  onClick={(e) => { e.stopPropagation(); setSelectedUser(rev.user?.name); fetchUserProfile(rev.user?.name); }}
                  className="font-medium text-xs sm:text-sm text-white hover:text-red-500 transition-colors cursor-pointer"
                >
                  {rev.user?.name}
                </h4>
                <p className="text-[10px] text-zinc-500 font-normal uppercase">{new Date(rev.createdAt * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-center px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs font-semibold">
              <Star size={12} fill="currentColor"/> {formattedScore} Score
            </div>
          </div>

          <h3 className="font-semibold text-white text-base md:text-lg mb-2 leading-tight">
            {rev.summary}
          </h3>

          <p className={`text-zinc-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal mb-3 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-4'}`}>
            {rev.body}
          </p>

          {rev.body && rev.body.length > 300 && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleReviewExpand(rev.id); }} 
              className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors mb-4 self-start flex items-center gap-1 select-none"
            >
              {isExpanded ? 'Show Less' : 'Read Full Review'}
              <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
              Review for:{' '}
              <span 
                onClick={(e) => { e.stopPropagation(); handleMediaClick(rev.media.id, rev.media.title); }}
                className="text-zinc-300 hover:text-red-500 cursor-pointer font-semibold normal-case"
              >
                {rev.media.title.english || rev.media.title.userPreferred}
              </span>
            </span>
            {rev.ratingAmount > 0 && (
              <span className="text-[10px] text-zinc-500 font-normal">{rev.rating} of {rev.ratingAmount} found helpful</span>
            )}
          </div>
        </div>

        {/* Media Poster Column on the Right */}
        <div 
          onClick={(e) => { e.stopPropagation(); handleMediaClick(rev.media.id, rev.media.title); }}
          className="shrink-0 w-24 md:w-28 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-md cursor-pointer hover:scale-[1.03] transition-transform mx-auto md:mx-0 self-center md:self-start"
        >
          <img 
            src={rev.media.coverImage?.large} 
            alt={rev.media.title.userPreferred} 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
    );
  };

  const renderRecommendationCard = (rec: any) => {
    const userRating = rec.userRating;
    const hasUserRating = userRating !== 0;

    return (
      <div key={rec.id} className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 backdrop-blur-sm flex flex-col justify-between text-left">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <img 
              src={rec.user?.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.user?.name || 'User')}&background=333&color=fff`} 
              alt={rec.user?.name}
              onClick={(e) => { e.stopPropagation(); setSelectedUser(rec.user?.name); fetchUserProfile(rec.user?.name); }}
              className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform" 
            />
            <div>
              <h4 
                onClick={(e) => { e.stopPropagation(); setSelectedUser(rec.user?.name); fetchUserProfile(rec.user?.name); }}
                className="font-normal text-xs sm:text-sm text-zinc-200 hover:text-red-500 transition-colors cursor-pointer"
              >
                {rec.user?.name}
              </h4>
              <p className="text-[9px] text-zinc-500 font-medium uppercase">Fan recommendation</p>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between gap-4 p-4 bg-white/5 border border-white/[0.03] rounded-2xl mb-4">
            {/* Left Media */}
            <div 
              onClick={(e) => { e.stopPropagation(); handleMediaClick(rec.media.id, rec.media.title); }}
              className="flex items-center gap-3.5 min-w-0 cursor-pointer group/item flex-1"
            >
              <img src={rec.media.coverImage?.large} className="w-16 h-24 rounded-xl object-cover border border-white/10 shrink-0 shadow-md group-hover/item:scale-102 transition-transform" alt="" />
              <div className="min-w-0 text-left flex flex-col gap-0.5">
                <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">If you liked</p>
                <h5 className="font-medium text-xs text-zinc-200 group-hover/item:text-red-500 line-clamp-3 leading-snug transition-colors">
                  {rec.media.title.english || rec.media.title.userPreferred}
                </h5>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center text-red-500 bg-red-500/10 w-8 h-8 rounded-full">
              <ChevronRight size={16} />
            </div>

            {/* Right Media */}
            <div 
              onClick={(e) => { e.stopPropagation(); handleMediaClick(rec.mediaRecommendation.id, rec.mediaRecommendation.title); }}
              className="flex items-center gap-3.5 min-w-0 cursor-pointer group/item flex-1"
            >
              <img src={rec.mediaRecommendation.coverImage?.large} className="w-16 h-24 rounded-xl object-cover border border-white/10 shrink-0 shadow-md group-hover/item:scale-102 transition-transform" alt="" />
              <div className="min-w-0 text-left flex flex-col gap-0.5">
                <p className="text-[9px] text-red-500/90 font-medium uppercase tracking-wider">Check out</p>
                <h5 className="font-medium text-xs text-zinc-200 group-hover/item:text-red-500 line-clamp-3 leading-snug transition-colors">
                  {rec.mediaRecommendation.title.english || rec.mediaRecommendation.title.userPreferred}
                </h5>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
            <Heart size={11} className="text-red-500 fill-current" /> Rating: {rec.rating || 0} likes
          </span>
          {hasUserRating && (
            <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-zinc-400 font-medium uppercase">Your match: {userRating}</span>
          )}
        </div>
      </div>
    );
  };

  // --- RENDER FORUM SEARCH RESULTS OVERLAY SCREEN ---
  if (searchQuery.trim()) {
    const filteredPosts = combinedActivities.filter(act => 
      act.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      act.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.media?.title?.userPreferred?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.media?.title?.english?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredReviews = reviews.filter(rev => 
      rev.summary?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rev.body?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rev.media?.title?.userPreferred?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.media?.title?.english?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRecs = recommendations.filter(rec => 
      rec.media?.title?.userPreferred?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rec.media?.title?.english?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.mediaRecommendation?.title?.userPreferred?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rec.mediaRecommendation?.title?.english?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 animate-in fade-in duration-500 text-left">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search size={18} className="text-red-500" />
              <span>Search Results in Anime Forum for "{searchQuery}"</span>
            </h2>
            <p className="text-zinc-500 text-xs mt-1">Discussions, reviews, recommendations, and users matching your search.</p>
          </div>
          {onSearchClear && (
            <button
              onClick={onSearchClear}
              className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3.5 py-1.5 rounded-full transition-all active:scale-95 flex items-center gap-1.5"
            >
              Back to Forum
            </button>
          )}
        </div>

        <div className="space-y-12">
          {/* 1. Matching Users */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wider">
              <Users size={15} className="text-red-500" />
              <span>Matching Users</span>
            </h3>
            {usersLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="animate-spin text-red-500" size={16} />
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Searching directory...</span>
              </div>
            ) : searchedUsers.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No users found matching "{searchQuery}".</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchedUsers.map(user => (
                  <div 
                    key={user.id} 
                    onClick={() => { setSelectedUser(user.name); fetchUserProfile(user.name); }}
                    className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <img 
                      src={user.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=333&color=fff`} 
                      className="w-12 h-12 rounded-full object-cover border border-white/10 mb-2" 
                      alt="" 
                    />
                    <h4 className="font-semibold text-xs text-zinc-200 truncate w-full">{user.name}</h4>
                    <p className="text-[9px] text-zinc-500 truncate w-full mt-0.5">Member</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Matching Discussions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wider">
              <MessageSquare size={15} className="text-red-500" />
              <span>Matching Discussions</span>
            </h3>
            {filteredPosts.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No discussion posts found matching "{searchQuery}".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPosts.map(act => renderActivityCard(act))}
              </div>
            )}
          </div>

          {/* 3. Matching Reviews */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wider">
              <Star size={15} className="text-red-500" />
              <span>Matching Reviews</span>
            </h3>
            {filteredReviews.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No reviews found matching "{searchQuery}".</p>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map(rev => renderReviewCard(rev))}
              </div>
            )}
          </div>

          {/* 4. Matching Recommendations */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2 uppercase tracking-wider">
              <ThumbsUp size={15} className="text-red-500" />
              <span>Matching Recommendations</span>
            </h3>
            {filteredRecs.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">No recommendations found matching "{searchQuery}".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRecs.map(rec => renderRecommendationCard(rec))}
              </div>
            )}
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // --- DEFAULT FORUM RENDER VIEW ---
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 animate-in fade-in duration-500 text-left">
      
      {/* Forum Content Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 flex lg:flex-col gap-2 p-1.5 rounded-2xl bg-[#0c0c0e]/30 border border-white/5 backdrop-blur-md overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setForumSection('feed')} 
            className={`flex-1 lg:flex-none shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 ${forumSection === 'feed' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Clock size={16} />
            <span>Activity Feed</span>
          </button>
          <button 
            onClick={() => setForumSection('reviews')} 
            className={`flex-1 lg:flex-none shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 ${forumSection === 'reviews' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Star size={16} />
            <span>Reviews Board</span>
          </button>
          <button 
            onClick={() => setForumSection('recommendations')} 
            className={`flex-1 lg:flex-none shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 ${forumSection === 'recommendations' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ThumbsUp size={16} />
            <span>Recommendations</span>
          </button>
          <button 
            onClick={() => setForumSection('users')} 
            className={`flex-1 lg:flex-none shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 ${forumSection === 'users' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users size={16} />
            <span>Users Directory</span>
          </button>
        </div>

        {/* Main Forum Panels */}
        <div className="flex-1 w-full min-w-0">
          
          {/* Activity Feed Section */}
          {forumSection === 'feed' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Create Post Input Card */}
              <div className="bg-[#0d0d0f]/50 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-md mb-6">
                <div className="flex gap-4">
                  <img 
                    src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ef4444&color=fff`} 
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 shadow-md animate-pulse" 
                    alt="" 
                  />
                  <div className="flex-1 space-y-3">
                    <textarea
                      rows={3}
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder="What's on your mind about anime? Share your thoughts, reviews, or questions..."
                      className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none custom-scrollbar font-normal"
                    />
                    
                    {/* Optional linked anime display */}
                    {selectedLinkAnime ? (
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl max-w-xs animate-in zoom-in-95 duration-200">
                        <img src={selectedLinkAnime.coverImage?.large} className="w-8 h-12 rounded-lg object-cover" alt="" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Linked Anime</p>
                          <h4 className="font-semibold text-xs text-zinc-200 truncate">{selectedLinkAnime.title.english || selectedLinkAnime.title.userPreferred}</h4>
                        </div>
                        <button 
                          onClick={() => setSelectedLinkAnime(null)}
                          className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Link Anime Search input */
                      <div className="relative max-w-xs text-left">
                        <PlusCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={postAnimeSearch}
                          onChange={(e) => handleLinkAnimeSearch(e.target.value)}
                          placeholder="Link an Anime (optional)..."
                          className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-white/10 rounded-full py-1.5 pl-8 pr-4 text-[11px] text-white placeholder-zinc-500 focus:outline-none font-normal"
                        />
                        {postAnimeResults.length > 0 && (
                          <div className="absolute left-0 right-0 mt-2 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 p-1.5 space-y-1">
                            {postAnimeResults.map(media => (
                              <button
                                key={media.id}
                                onClick={() => {
                                  setSelectedLinkAnime(media);
                                  setPostAnimeSearch('');
                                  setPostAnimeResults([]);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                              >
                                <img src={media.coverImage?.large} className="w-6 h-9 rounded object-cover shrink-0" alt="" />
                                <span className="truncate">{media.title.english || media.title.userPreferred}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end border-t border-white/5 pt-3.5">
                      <button
                        onClick={handleCreatePost}
                        disabled={!postText.trim()}
                        className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-red-600/25 flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        <span>Share Post</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {combinedActivities.length === 0 && communityLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Fetching live updates...</p>
                </div>
              ) : combinedActivities.length === 0 ? (
                <div className="text-zinc-500 text-xs py-10 italic">No community activity found at this time.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {combinedActivities.map((act) => renderActivityCard(act))}
                  </div>

                  {communityLoading && (
                    <div className="flex justify-center mt-6">
                      <Loader2 className="animate-spin text-red-500" size={20} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Reviews Board Section */}
          {forumSection === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {reviews.length === 0 && communityLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-zinc-500 text-xs py-10 italic">No reviews found at this time.</div>
              ) : (
                <>
                  <div className="space-y-5">
                    {reviews.map((rev) => renderReviewCard(rev))}
                  </div>

                  {communityLoading && (
                    <div className="flex justify-center mt-6">
                      <Loader2 className="animate-spin text-red-500" size={20} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recommendations Section */}
          {forumSection === 'recommendations' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {recommendations.length === 0 && communityLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Fetching recommendations...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-zinc-500 text-xs py-10 italic">No recommendations found.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendations.map((rec) => renderRecommendationCard(rec))}
                  </div>

                  {communityLoading && (
                    <div className="flex justify-center mt-6">
                      <Loader2 className="animate-spin text-red-500" size={20} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Users Directory Tab Section */}
          {forumSection === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-[#0d0d0f]/50 border border-white/5 rounded-3xl p-5 md:p-6 backdrop-blur-md mb-6 text-left">
                <h3 className="font-semibold text-sm text-white mb-2">Search Users Directory</h3>
                <p className="text-zinc-500 text-xs mb-4">Connect with other members of the MovieVerse and AniList anime communities.</p>
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    value={usersSearchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    placeholder="Type a username to search..."
                    className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none font-normal"
                  />
                </div>
              </div>

              <div className="relative min-h-[250px]">
                {usersLoading && (
                  <div className="absolute inset-0 z-10 bg-black/45 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-red-500" size={32} />
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Searching directory...</p>
                  </div>
                )}
                
                {searchedUsers.length === 0 && !usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <Users size={48} className="text-white/20 mb-4 animate-pulse" />
                    <h4 className="text-sm font-bold text-white mb-1">No Users Found</h4>
                    <p className="text-zinc-500 text-xs max-w-sm">Try typing a username in the search box above to lookup members.</p>
                  </div>
                ) : (
                  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 transition-opacity duration-200 ${usersLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                    {searchedUsers.map((user) => (
                      <div 
                        key={user.id} 
                        onClick={() => { setSelectedUser(user.name); fetchUserProfile(user.name); }}
                        className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 p-5 rounded-3xl flex flex-col items-center text-center cursor-pointer transition-all hover:scale-102"
                      >
                        <img 
                          src={user.avatar?.large || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=333&color=fff`} 
                          className="w-16 h-16 rounded-full object-cover border border-white/10 mb-3 shadow-md" 
                          alt="" 
                        />
                        <h4 className="font-semibold text-xs text-zinc-200 truncate w-full">{user.name}</h4>
                        <p className="text-[9px] text-zinc-500 truncate w-full mt-1.5 uppercase font-medium tracking-wider">AniList Member</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {renderModals()}

    </div>
  );
};
