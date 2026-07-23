  export interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string, language?: string, subtitle?: string) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string, language?: string, subtitle?: string) => string;
  supportsPostMessage: boolean;
}

export const getAudioCode = (lang: string, format: 'name' | 'iso') => {
  const map: Record<string, string> = {
    'English': 'en',
    'Hindi': 'hi',
    'Spanish': 'es',
    'Japanese': 'ja',
    'French': 'fr',
    'German': 'de',
    'Portuguese': 'pt',
    'Russian': 'ru'
  };
  return format === 'iso' ? (map[lang] || 'en') : lang;
};

export const getSubtitleCode = (sub: string, format: 'name' | 'iso') => {
  if (sub === 'None') return '';
  const map: Record<string, string> = {
    'English': 'en',
    'Hindi': 'hi',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Portuguese': 'pt',
    'Russian': 'ru'
  };
  return format === 'iso' ? (map[sub] || 'en') : sub;
};

export const PROVIDERS: Provider[] = [
  {
    id: 'auto',
    name: 'Auto (Fastest Server)',
    getMovieUrl: (tmdbId, color, progress) => '',
    getTvUrl: (tmdbId, season, episode, color, progress) => '',
    supportsPostMessage: true
  },
  {
    id: 'videasy_adfree',
    name: 'VidEasy',
    getMovieUrl: (tmdbId, color, progress) => {
      const colorParam = color ? color.replace('#', '') : 'EF4444';
      const progressParam = progress && progress > 0 ? `&progress=${Math.floor(progress)}` : '';
      return `https://player.videasy.net/movie/${tmdbId}?overlay=false&color=${colorParam}&autoplay=true${progressParam}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const colorParam = color ? color.replace('#', '') : 'EF4444';
      const progressParam = progress && progress > 0 ? `&progress=${Math.floor(progress)}` : '';
      return `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=${colorParam}&autoplay=true${progressParam}`;
    },
    supportsPostMessage: false
  },
  {
    id: 'megaplay',
    name: 'MegaPlay',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => {
      const lang = animeLanguage === 'dub' ? 'dub' : 'sub';
      return `https://animeplay.cfd/stream/ani/${anilistId || tmdbId}/1/${lang}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => {
      const lang = animeLanguage === 'dub' ? 'dub' : 'sub';
      return `https://animeplay.cfd/stream/ani/${anilistId || tmdbId}/${episode}/${lang}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'anikai',
    name: 'Anikai',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language) => {
      const subdub = animeLanguage === 'dub' || (language && language !== 'Japanese') ? 'dub' : 'sub';
      return `/api/anime?provider=anikai&tmdbId=${tmdbId}&mediaType=movie&anilistId=${anilistId || ''}&lang=${subdub}${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language) => {
      const subdub = animeLanguage === 'dub' || (language && language !== 'Japanese') ? 'dub' : 'sub';
      return `/api/anime?provider=anikai&tmdbId=${tmdbId}&mediaType=tv&season=${season}&episode=${episode}&anilistId=${anilistId || ''}&lang=${subdub}${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: false
  },
  {
    id: 'cinesrc',
    name: 'CineSrc',
    getMovieUrl: (tmdbId, color, progress) => {
      const hexColor = color ? `%23${color.replace('#', '')}` : '%23EF4444';
      const startAt = progress && progress > 0 ? `&t=${Math.floor(progress)}&continueprompt=false` : '';
      return `https://cinesrc.st/embed/movie/${tmdbId}?autoplay=true&controls=false&color=${hexColor}&back=close${startAt}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const hexColor = color ? `%23${color.replace('#', '')}` : '%23EF4444';
      const startAt = progress && progress > 0 ? `&t=${Math.floor(progress)}&continueprompt=false` : '';
      return `https://cinesrc.st/embed/tv/${tmdbId}?s=${season}&e=${episode}&autoplay=true&controls=false&color=${hexColor}&back=close${startAt}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => 
      `https://vidfast.vc/movie/${tmdbId}?autoPlay=true&controls=false&theme=${color.replace('#', '')}${subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : ''}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => 
      `https://vidfast.vc/tv/${tmdbId}/${season}/${episode}?autoPlay=true&controls=false&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : ''}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: true
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'vidnest_animepahe',
    name: 'AnimePahe',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'peachify',
    name: 'Peachify',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dubVal = language || 'Hindi';
      const subVal = subtitle === 'None' ? '' : (subtitle || 'English');
      return `https://peachify.pro/embed/movie/${tmdbId}?accent=${color.replace('#', '')}&dub=${dubVal}&sub=${subVal}&quality=1080&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dubVal = language || 'Hindi';
      const subVal = subtitle === 'None' ? '' : (subtitle || 'English');
      return `https://peachify.pro/embed/tv/${tmdbId}/${season}/${episode}?accent=${color.replace('#', '')}&dub=${dubVal}&sub=${subVal}&quality=1080&autoNext=30&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: false
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS',
    getMovieUrl: (tmdbId, color, progress) => {
      const cleanColor = color ? color.replace('#', '') : 'EF4444';
      const startAt = progress && progress > 0 ? `&startTime=${Math.floor(progress)}` : '';
      return `https://cinemaos.tech/player/${tmdbId}?theme=${cleanColor}&autoPlay=true&title=false&poster=false${startAt}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const cleanColor = color ? color.replace('#', '') : 'EF4444';
      const startAt = progress && progress > 0 ? `&startTime=${Math.floor(progress)}` : '';
      return `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}?theme=${cleanColor}&autoPlay=true&nextButton=true&autoNext=true&title=false&poster=false${startAt}`;
    },
    supportsPostMessage: false
  },
  {
    id: 'zxcstream',
    name: 'ZXCStream',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dub = language ? getAudioCode(language, 'iso') : 'hi';
      const subVal = subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : '';
      return `https://zxcstream.xyz/player/movie/${tmdbId}?dubLang=${dub}&color=${color.replace('#', '')}&autoplay=true${subVal}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dub = language ? getAudioCode(language, 'iso') : 'hi';
      const subVal = subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : '';
      return `https://zxcstream.xyz/player/tv/${tmdbId}/${season}/${episode}?dubLang=${dub}&color=${color.replace('#', '')}&autoplay=true${subVal}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'xpass',
    name: 'XPass',
    getMovieUrl: (tmdbId) => `https://play.xpass.top/e/movie/${tmdbId}`,
    getTvUrl: (tmdbId, season, episode) => `https://play.xpass.top/e/tv/${tmdbId}/${season}/${episode}`,
    supportsPostMessage: false
  },
  {
    id: '2embed',
    name: '2Embed',
    getMovieUrl: (tmdbId) => `https://www.2embed.cc/embed/movie/${tmdbId}`,
    getTvUrl: (tmdbId, season, episode) => `https://www.2embed.cc/embed/tv/${tmdbId}/${season}/${episode}`,
    supportsPostMessage: false
  },
];

export const getFilteredProviders = (isAnime: boolean, isWatchParty: boolean = false, isAnimeDirect: boolean = false) => {
  let list = PROVIDERS.filter(p => {
    if (isWatchParty && !p.supportsPostMessage) return false;
    if (!isAnime && !isAnimeDirect) {
      return p.id !== 'vidnest_animepahe' && p.id !== 'anikai' && p.id !== 'megaplay';
    }
    return true;
  });

  if (isAnime || isAnimeDirect) {
    list = [...list].sort((a, b) => {
      const getPriority = (id: string) => {
        if (id === 'auto') return 100;
        if (id === 'megaplay') return 90;
        if (id === 'anikai') return 80;
        if (id === 'vidnest_animepahe') return 70;
        if (id === 'vidnest') return 60;
        return 0;
      };
      return getPriority(b.id) - getPriority(a.id);
    });
  }

  return list;
};
