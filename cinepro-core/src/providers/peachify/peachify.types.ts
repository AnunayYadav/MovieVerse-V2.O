/**
 * raw source object returned inside the decrypted/plain peachify api response.
 * fields are inconsistent across servers — many are optional or aliased.
 */
export interface PeachifyRawSource {
    [key: string]: unknown;
    url?: string;
    src?: string;
    file?: string;
    stream?: string;
    streamUrl?: string;
    playbackUrl?: string;

    type?: string;
    format?: string;
    container?: string;

    dub?: string;
    audio?: string;
    audioName?: string;
    audioLang?: string;
    language?: string;
    lang?: string;
    label?: string;
    name?: string;
    title?: string;

    quality?: string | number;
    resolution?: string | number;
    height?: string | number;
    res?: string | number;

    sizeBytes?: number;
    size?: number;
    bytes?: number;

    headers?: Record<string, string>;
    header?: Record<string, string>;
    requestHeaders?: Record<string, string>;
    httpHeaders?: Record<string, string>;
}

/**
 * raw subtitle entry from the peachify api response.
 */
export interface PeachifyRawSubtitle {
    url?: string;
    file?: string;
    src?: string;

    label?: string;
    name?: string;
    language?: string;

    langCode?: string;
    lang?: string;
}

/**
 * shape of the decrypted (or plain) peachify api response body.
 * when isEncrypted is true, data is a dot-separated aes-gcm ciphertext string.
 */
export interface PeachifyApiResponse {
    isEncrypted?: boolean;
    data?: string;
    sources?: PeachifyRawSource[];
    subtitles?: PeachifyRawSubtitle[];
}

/**
 * normalized source after extraction from a raw peachify source object.
 */
export interface PeachifyParsedSource {
    url: string;
    dub: string;
    type: 'hls' | 'mp4';
    quality: number | undefined;
    sizeBytes: number | undefined;
    headers: Record<string, string> | undefined;
    provider: string;
}

/**
 * normalized subtitle after extraction from a raw peachify subtitle object.
 */
export interface PeachifyParsedSubtitle {
    url: string;
    label: string;
    lang: string | undefined;
    display: string;
    provider: string;
}
