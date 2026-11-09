export interface CreditSceneInfo {
  status: 'mid-credit' | 'post-credit' | 'both' | 'none' | 'unknown';
  label: string;
  badgeText: string;
}

export interface FamilyFriendlyInfo {
  isFamilyFriendly: boolean;
  certification: string;
  label: string;
}

export interface AwardInfo {
  type: 'golden_globe' | 'oscar' | 'bafta' | 'national_award' | 'cannes' | 'general';
  text: string;
  iconName: string;
}

// 1. Credit Scenes Detector via TMDB Keywords
export function getCreditSceneInfo(keywordsData: any, releaseDate?: string): CreditSceneInfo {
  const keywordsList: Array<{ id: number; name: string }> = 
    keywordsData?.keywords || keywordsData?.results || (Array.isArray(keywordsData) ? keywordsData : []);

  if (!keywordsList || keywordsList.length === 0) {
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    if (year && year < 1995) {
      return { status: 'none', label: 'No End-Credit Scene', badgeText: 'No Credit Scene' };
    }
    return { status: 'none', label: 'No End-Credit Scene', badgeText: 'No End-Credit' };
  }

  let hasMidCredit = false;
  let hasPostCredit = false;

  for (const kw of keywordsList) {
    const id = kw.id;
    const name = (kw.name || '').toLowerCase();

    // TMDB official keyword ID 179431 = duringcreditsstinger
    if (id === 179431 || name.includes('duringcreditsstinger') || name.includes('mid-credit') || name.includes('mid credit')) {
      hasMidCredit = true;
    }
    // TMDB official keyword ID 179430 = aftercreditsstinger
    if (id === 179430 || name.includes('aftercreditsstinger') || name.includes('post-credit') || name.includes('after credit') || name.includes('post credit')) {
      hasPostCredit = true;
    }
  }

  if (hasMidCredit && hasPostCredit) {
    return { status: 'both', label: 'Mid & Post-Credit Scenes', badgeText: 'Mid & Post-Credits' };
  }
  if (hasMidCredit) {
    return { status: 'mid-credit', label: 'Mid-Credit Scene', badgeText: 'Mid-Credit Scene' };
  }
  if (hasPostCredit) {
    return { status: 'post-credit', label: 'Post-Credit Scene', badgeText: 'Post-Credit Scene' };
  }

  return { status: 'none', label: 'No End-Credit Scene', badgeText: 'No End-Credit' };
}

// 2. Family Friendly & Certification Detector
export function getFamilyFriendlyInfo(movie: any): FamilyFriendlyInfo {
  let cert = '';
  const releaseDates = movie?.release_dates?.results || [];
  const inRelease = releaseDates.find((r: any) => r.iso_3166_1 === 'IN');
  const usRelease = releaseDates.find((r: any) => r.iso_3166_1 === 'US');
  
  if (inRelease && inRelease.release_dates?.length > 0) {
    cert = inRelease.release_dates.find((d: any) => d.certification)?.certification || '';
  }
  if (!cert && usRelease && usRelease.release_dates?.length > 0) {
    cert = usRelease.release_dates.find((d: any) => d.certification)?.certification || '';
  }
  if (!cert && movie?.content_ratings?.results?.length > 0) {
    const inRating = movie.content_ratings.results.find((r: any) => r.iso_3166_1 === 'IN');
    const usRating = movie.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US');
    cert = (inRating || usRating || movie.content_ratings.results[0])?.rating || '';
  }

  const genres: Array<{ id: number; name: string } | number> = movie?.genres || movie?.genre_ids || [];
  const genreIds = genres.map(g => (typeof g === 'object' ? g.id : g));
  const hasHorror = genreIds.includes(27);
  const isAnimationOrFamily = genreIds.includes(16) || genreIds.includes(10751);

  const cleanCert = (cert || '').toUpperCase().trim();

  // Family friendly certifications: U, G, PG, TV-Y, TV-G, TV-PG
  if (['U', 'G', 'TV-Y', 'TV-G'].includes(cleanCert) || (['U/A', 'PG', 'TV-PG'].includes(cleanCert) && !hasHorror) || (isAnimationOrFamily && !hasHorror && !['A', 'R', 'NC-17'].includes(cleanCert))) {
    return {
      isFamilyFriendly: true,
      certification: cleanCert || 'Family',
      label: 'Family Friendly'
    };
  }

  if (['A', 'R', 'NC-17', 'TV-MA', '18+'].includes(cleanCert)) {
    return {
      isFamilyFriendly: false,
      certification: cleanCert,
      label: '18+ Mature'
    };
  }

  return {
    isFamilyFriendly: false,
    certification: cleanCert || 'PG-13',
    label: cleanCert ? `${cleanCert} Rated` : 'Parental Guidance'
  };
}

// 3. Known Award Winners Fallback & TMDB Keywords Parser
const PRESTIGE_AWARDS_MAP: Record<string, string> = {
  // The Wolf of Wall Street
  "106646": "1 Golden Globe",
  // Oppenheimer
  "872585": "7 Oscars",
  // Everything Everywhere All at Once
  "545611": "7 Oscars",
  // Parasite
  "496243": "4 Oscars",
  // RRR
  "579974": "1 Oscar",
  // The Godfather
  "238": "3 Oscars",
  // The Godfather Part II
  "240": "6 Oscars",
  // The Dark Knight
  "155": "2 Oscars",
  // Schindler's List
  "424": "7 Oscars",
  // Titanic
  "597": "11 Oscars",
  // The Lord of the Rings: The Return of the King
  "122": "11 Oscars",
  // The Lord of the Rings: The Fellowship of the Ring
  "120": "4 Oscars",
  // The Lord of the Rings: The Two Towers
  "121": "2 Oscars",
  // La La Land
  "313369": "6 Oscars",
  // Whiplash
  "244786": "3 Oscars",
  // Gladiator
  "98": "5 Oscars",
  // Dune: Part One
  "438631": "6 Oscars",
  // Dune: Part Two
  "693134": "3 Oscars",
  // Interstellar
  "157336": "1 Oscar",
  // Inception
  "27205": "4 Oscars",
  // Slumdog Millionaire
  "12405": "8 Oscars",
  // Spider-Man: Into the Spider-Verse
  "324857": "1 Oscar",
  // Spirited Away
  "129": "1 Oscar",
  // Forrest Gump
  "13": "6 Oscars",
  // Pulp Fiction
  "680": "1 Oscar",
  // No Country for Old Men
  "6977": "4 Oscars",
  // The Matrix
  "603": "4 Oscars",
  // Coco
  "354912": "2 Oscars",
  // Soul
  "508442": "2 Oscars",
  // Avatar
  "19995": "3 Oscars",
  // The Zone of Interest
  "467244": "2 Oscars",
  // Anatomy of a Fall
  "915935": "1 Oscar",
  // Poor Things
  "792307": "4 Oscars",
  // Spider-Man: Across the Spider-Verse
  "569094": "1 Golden Globe",
  // Dangal
  "360814": "National Film Award",
  // Baahubali 2: The Conclusion
  "359940": "3 National Awards",
  // Kantara
  "1024535": "2 National Awards"
};

export function getAwardInfo(movie: any, omdbAwards?: string): AwardInfo | null {
  const movieIdStr = String(movie?.id || '');
  
  // 1. Check known prestige awards map
  if (PRESTIGE_AWARDS_MAP[movieIdStr]) {
    const text = PRESTIGE_AWARDS_MAP[movieIdStr];
    const isGlobe = text.toLowerCase().includes('globe');
    const isNational = text.toLowerCase().includes('national');
    return {
      type: isGlobe ? 'golden_globe' : isNational ? 'national_award' : 'oscar',
      text: text,
      iconName: isGlobe ? 'globe' : isNational ? 'award' : 'trophy'
    };
  }

  // 2. Parse from TMDB keywords if available
  const keywordsList: Array<{ id: number; name: string }> = 
    movie?.keywords?.keywords || movie?.keywords?.results || (Array.isArray(movie?.keywords) ? movie?.keywords : []);

  for (const kw of keywordsList) {
    const name = (kw.name || '').toLowerCase();
    if (name.includes('academy award') || name.includes('oscar winner')) {
      return { type: 'oscar', text: 'Oscar Winner', iconName: 'trophy' };
    }
    if (name.includes('golden globe winner') || name.includes('golden globe')) {
      return { type: 'golden_globe', text: '1 Golden Globe', iconName: 'globe' };
    }
    if (name.includes('bafta award') || name.includes('bafta winner')) {
      return { type: 'bafta', text: 'BAFTA Winner', iconName: 'trophy' };
    }
    if (name.includes('palme d\'or') || name.includes('cannes film festival')) {
      return { type: 'cannes', text: "Palme d'Or", iconName: 'trophy' };
    }
    if (name.includes('national film award')) {
      return { type: 'national_award', text: "National Film Award", iconName: 'award' };
    }
  }

  // 3. Parse from OMDb awards string if provided
  if (omdbAwards && typeof omdbAwards === 'string') {
    const oscarMatch = omdbAwards.match(/Won (\d+) Oscar/i);
    if (oscarMatch) {
      const count = parseInt(oscarMatch[1]);
      return {
        type: 'oscar',
        text: `${count} Oscar${count > 1 ? 's' : ''}`,
        iconName: 'trophy'
      };
    }
    const globeMatch = omdbAwards.match(/Won (\d+) Golden Globe/i);
    if (globeMatch) {
      const count = parseInt(globeMatch[1]);
      return {
        type: 'golden_globe',
        text: `${count} Golden Globe${count > 1 ? 's' : ''}`,
        iconName: 'globe'
      };
    }
    if (omdbAwards.toLowerCase().includes('oscar')) {
      return { type: 'oscar', text: 'Oscar Winner', iconName: 'trophy' };
    }
    if (omdbAwards.toLowerCase().includes('golden globe')) {
      return { type: 'golden_globe', text: 'Golden Globe Winner', iconName: 'globe' };
    }
  }

  return null;
}
