export interface ApiResponse {
    success: boolean;
    sources: Source[];
    imdbId: string;
    tmdbId: string;
}

export interface Source {
    url: StreamUrl[];
    headers: Record<string, string>;
    tracks: Track[];
    provider: string;
    servers: string[];
    proxy: boolean;
    responseTime: number;
}

export interface StreamUrl {
    link: string;
    type: string;
    lang: string;
    quality: string;
}

export interface Track {
    [key: string]: any;
}
