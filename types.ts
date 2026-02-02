
export interface Movie {
  id: number;
  title: string;
  original_title?: string;
  name?: string; // For TV
  original_name?: string; // For TV
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: 'movie' | 'tv' | 'person';
  original_language?: string;
  runtime?: number;
  episode_run_time?: number[];
  adult?: boolean;
  year?: number; // fallback
  poster?: string; // fallback
  backdrop?: string; // fallback
  rating?: number; // fallback
  certification?: string; // fallback
  ott?: any[]; // fallback
  // Person specific
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: Movie[];
  
  // Watch History Tracking
  play_progress?: number; // percentage 0-100
  last_watched_data?: {
      season?: number;
      episode?: number;
      current_time?: number;
      duration?: number;
      updated_at?: number;
  };
}

export interface Genre {
  id: number;
  name: string;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface CollectionDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  parts: Movie[];
}

export interface ExternalIds {
    imdb_id?: string;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
}

export interface Network {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
}

export interface ProductionCompany {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
}

export interface SpokenLanguage {
    english_name: string;
    iso_639_1: string;
    name: string;
}

export interface MovieDetails extends Movie {
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  production_companies?: ProductionCompany[];
  spoken_languages?: SpokenLanguage[];
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos?: {
    results: VideoResult[];
  };
  similar?: {
    results: Movie[];
  };
  seasons?: Season[];
  images?: {
    backdrops: Image[];
    posters: Image[];
    logos?: Image[];
  };
  "watch/providers"?: {
    results: Record<string, ProviderRegion>;
  };
  external_ids?: ExternalIds;
  homepage?: string;
  content_ratings?: {
    results: ContentRating[];
  };
  release_dates?: {
    results: ReleaseDateResult[];
  };
  reviews?: {
    results: Review[];
  };
  created_by?: Creator[];
  keywords?: {
    keywords?: Keyword[];
    results?: Keyword[];
  };
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  };
  networks?: Network[];
  type?: string;
}

export interface Review {
  author: string;
  content: string;
  id: string;
  created_at: string;
  author_details?: {
      rating?: number;
      avatar_path?: string;
  }
}

export interface Creator {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  popularity: number;
}

export interface ContentRating {
  iso_3166_1: string;
  rating: string;
}

export interface ReleaseDateResult {
  iso_3166_1: string;
  release_dates: { certification: string }[];
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  episodes?: Episode[];
  air_date?: string;
  overview?: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  popularity: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  popularity: number;
}

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Image {
  file_path: string;
  aspect_ratio: number;
  iso_639_1?: string | null;
  vote_average?: number;
  vote_count?: number;
}

export interface ProviderRegion {
  link: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  free?: Provider[];
  ads?: Provider[];
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface UserSettings {
    tmdbKey?: string;
}

export interface UserProfile {
  name: string;
  age: string;
  genres: string[];
  avatar?: string;
  avatarBackground?: string;
  canWatch?: boolean; // New Flag for Restricted Access
  theme?: 'default' | 'gold'; // Theme preference for exclusive users
  enableHistory?: boolean; // Toggle for history recording
  // Synced Preferences
  maturityRating?: MaturityRating;
  region?: string;
}

export interface AIAnalysisResult {
  persona: string;
  analysis: string;
  suggestion: string;
  recommendations: string[];
  community_vibe: string;
  future_radar: string[];
  enrichedRecs?: Movie[];
  enrichedFuture?: Movie[];
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string;
  place_of_birth: string;
  profile_path: string | null;
  known_for_department: string;
  combined_credits: {
    cast: Movie[];
  };
  external_ids?: ExternalIds;
  homepage?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface LiveChannel {
    id: string;
    name: string;
    logo: string;
    url: string;
    group?: string;
    country?: string;
}

// --- LIVE SPORTS TYPES ---

export interface Sport {
    id: string;
    name: string;
}

export interface APIMatch {
    id: string;
    title: string;
    category: string;
    date: number; // Unix timestamp in milliseconds
    popular: boolean;
    teams?: {
        home?: {
            name: string;
            badge: string;
        },
        away?: {
            name: string;
            badge: string;
        }
    };
}

export interface Stream {
    id: string;
    streamNo: number;
    language: string;
    hd: boolean;
    embedUrl: string;
    source: string;
}

export interface MatchDetail {
    sources: Stream[];
}

export type MaturityRating = "G" | "PG" | "PG-13" | "R" | "NC-17";

export const INDIAN_LANGUAGES = [
  { code: "hi", name: "Hindi (Bollywood)" },
  { code: "te", name: "Telugu (Tollywood)" },
  { code: "ta", name: "Tamil (Kollywood)" },
  { code: "ml", name: "Malayalam (Mollywood)" },
  { code: "kn", name: "Kannada (Sandalwood)" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "bn", name: "Bengali" },
  { code: "pa", name: "Punjabi" },
  { code: "en", name: "English" }
];

export const GENRES_MAP: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878,
  "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37
};
export const GENRES_LIST = Object.keys(GENRES_MAP);
