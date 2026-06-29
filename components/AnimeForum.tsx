import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, RefreshCcw, Clock, Star, ThumbsUp, Loader2, Heart, 
  MessageCircle, ChevronDown, ChevronRight, X, AlertCircle, Film 
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
}

export const AnimeForum: React.FC<AnimeForumProps> = ({ apiKey, onAnimeClick, fetchAniList, titleLanguage }) => {
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const toggleReviewExpand = (reviewId: number) => {
    setExpandedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  // Community discussion board state variables
  const [forumSection, setForumSection] = useState<'feed' | 'reviews' | 'recommendations'>('feed');
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

  const fetchReplies = async (activityId: number) => {
    setRepliesLoading(true);
    try {
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
      setActivityReplies(data.Page?.activityReplies || []);
    } catch (e) {
      console.error("Failed to fetch activity replies:", e);
    } finally {
      setRepliesLoading(false);
    }
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

  const handleMediaClick = async (mediaId: number, mediaTitle: string) => {
    const mockMedia: AniListMedia = {
      id: mediaId,
      title: {
        romaji: mediaTitle,
        english: mediaTitle,
        native: mediaTitle,
        userPreferred: mediaTitle
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

    const titlesToTry = [
      mockMedia.title.english,
      mockMedia.title.romaji,
      mockMedia.title.userPreferred
    ].filter((t): t is string => typeof t === 'string' && t.length > 0);

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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 animate-in fade-in duration-500 select-none text-left">
      
      {/* Forum Content Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 flex lg:flex-col gap-2 p-1.5 rounded-2xl bg-[#0c0c0e]/30 border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setForumSection('feed')} 
            className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wider transition-all duration-300 ${forumSection === 'feed' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Clock size={16} />
            <span>Activity Feed</span>
          </button>
          <button 
            onClick={() => setForumSection('reviews')} 
            className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wider transition-all duration-300 ${forumSection === 'reviews' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Star size={16} />
            <span>Reviews Board</span>
          </button>
          <button 
            onClick={() => setForumSection('recommendations')} 
            className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wider transition-all duration-300 ${forumSection === 'recommendations' ? 'bg-white/5 border border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ThumbsUp size={16} />
            <span>Recommendations</span>
          </button>
        </div>

        {/* Main Forum Panels */}
        <div className="flex-1 w-full min-w-0">
          
          {/* Activity Feed Section */}
          {forumSection === 'feed' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {activities.length === 0 && communityLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-red-500" size={32} />
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Fetching live updates...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-zinc-500 text-xs py-10 italic">No community activity found at this time.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activities.map((act) => {
                      const isText = act.type === 'TEXT';
                      const hasMedia = act.media;
                      const actionText = isText ? act.text : `${act.status.toLowerCase().replace('_', ' ')} ${act.progress ? `${act.progress} of` : ''}`;
                      
                      return (
                        <div key={act.id} className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col justify-between h-full backdrop-blur-sm group/card">
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
                            </div>

                            {/* Card Body - Content & Poster Side-by-Side */}
                            <div className="flex flex-row gap-4 items-start flex-1 min-w-0 mb-4">
                              <div className="flex-1 min-w-0 text-left">
                                {!isText ? (
                                  <p className="text-zinc-300 text-xs sm:text-sm font-semibold leading-relaxed">
                                    <span className="text-zinc-400 capitalize">{actionText}</span>{' '}
                                    {hasMedia && (
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); handleMediaClick(act.media.id, act.media.title.userPreferred); }}
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
                                  onClick={(e) => { e.stopPropagation(); handleMediaClick(act.media.id, act.media.title.userPreferred); }}
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
                            <button className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                              <Heart size={13} className="fill-none transition-transform" />
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
                    })}
                  </div>

                  <div className="flex justify-center mt-8">
                    <button 
                      onClick={() => setFeedPage(prev => prev + 1)}
                      disabled={communityLoading}
                      className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                    >
                      {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Updates'}
                    </button>
                  </div>
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
                    {reviews.map((rev) => {
                      const reviewScore = rev.score;
                      const formattedScore = `${reviewScore}%`;
                      const isExpanded = expandedReviews[rev.id] || false;
                      
                      return (
                        <div 
                          key={rev.id} 
                          onClick={() => toggleReviewExpand(rev.id)} 
                          className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start gap-6 backdrop-blur-sm cursor-pointer select-none"
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
                                  onClick={(e) => { e.stopPropagation(); handleMediaClick(rev.media.id, rev.media.title.userPreferred); }}
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
                            onClick={(e) => { e.stopPropagation(); handleMediaClick(rev.media.id, rev.media.title.userPreferred); }}
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
                    })}
                  </div>

                  <div className="flex justify-center mt-8">
                    <button 
                      onClick={() => setReviewsPage(prev => prev + 1)}
                      disabled={communityLoading}
                      className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                    >
                      {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Reviews'}
                    </button>
                  </div>
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
                    {recommendations.map((rec) => {
                      const userRating = rec.userRating;
                      const hasUserRating = userRating !== 0;

                      return (
                        <div key={rec.id} className="bg-[#0d0d0f]/40 border border-white/5 hover:border-white/10 transition-all rounded-3xl p-5 backdrop-blur-sm flex flex-col justify-between">
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
                                onClick={(e) => { e.stopPropagation(); handleMediaClick(rec.media.id, rec.media.title.userPreferred); }}
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
                                onClick={(e) => { e.stopPropagation(); handleMediaClick(rec.mediaRecommendation.id, rec.mediaRecommendation.title.userPreferred); }}
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
                    })}
                  </div>

                  <div className="flex justify-center mt-8">
                    <button 
                      onClick={() => setRecommendationsPage(prev => prev + 1)}
                      disabled={communityLoading}
                      className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                    >
                      {communityLoading ? <Loader2 className="animate-spin text-white" size={14} /> : 'Load More Recommendations'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

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
                        <p className="text-[10px] text-zinc-500 mt-1 font-normal">{( (userProfileData?.statistics?.anime?.episodesWatched || 0) ).toLocaleString()} episodes</p>
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
                            onClick={() => { setSelectedUser(null); handleMediaClick(fav.id, fav.title.userPreferred); }}
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
                                  onClick={() => { setSelectedUser(null); handleMediaClick(med.id, med.title.userPreferred); }}
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
          </div>
        </div>
      )}

    </div>
  );
};
