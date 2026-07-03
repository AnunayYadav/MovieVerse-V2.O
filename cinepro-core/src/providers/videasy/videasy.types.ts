/**
 * raw response from the api.videasy.net sources-with-title endpoint.
 * the data field is an encrypted string when isEncrypted is true.
 */
export interface VideasyEncryptedResponse {
    data: string;
    isEncrypted?: boolean;
}

/**
 * decrypted payload shape from api.videasy.net.
 */
export interface VideasyDecryptedPayload {
    sources: VideasyRawSource[];
    subtitles?: VideasyRawSubtitle[];
}

/**
 * individual source entry from the decrypted videasy payload.
 * the quality field is actually a language/audio label on some endpoints
 * (e.g. "Hindi", "English") rather than a resolution.
 */
export interface VideasyRawSource {
    url: string;
    quality?: string;
    type?: string;
}

/**
 * subtitle entry from the decrypted videasy payload.
 */
export interface VideasyRawSubtitle {
    url: string;
    label?: string;
    language?: string;
    lang?: string;
}

/**
 * shape of the params sent to each api.videasy.net endpoint.
 */
export interface VideasyApiParams {
    title: string;
    mediaType: 'movie' | 'tv';
    totalSeasons?: number;
    episodeId: number;
    seasonId: number;
    tmdbId: string | number;
    imdbId?: string;
    language?: string;
}

/**
 * one configured api endpoint with its base url and optional language override.
 */
export interface VideasyServer {
    readonly name: string;
    readonly url: string;
    readonly language?: string;
}
