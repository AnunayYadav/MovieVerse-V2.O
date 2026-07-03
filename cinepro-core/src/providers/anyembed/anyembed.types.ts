export interface TokenResponse {
    expires_in: number;
    success: boolean;
    token: string;
}

export interface AnyEmbedApiResponse {
    extraction_mode: string;
    feedback_exp: number;
    feedback_token: string;
    proxy_exp: number;
    proxy_token: string;
    sources: Source[];
    success: boolean;
    title: string;
    year: number;
}

export interface Source {
    confidence: string;
    penalty: number;
    provider: string;
    requires_proxy: boolean;
    score: number;
    scrape_type: string;
    streams: Stream[];
    success_rate: number;
    timestamp: number;
}

export interface Stream {
    format: any;
    headers: Record<string, string>;
    proxy_mode: string;
    quality: string;
    quality_score: number;
    requires_proxy: boolean;
    subtitles: Subtitle[];
    url: string;
}

export interface Subtitle {
    label: string;
    language: string;
    url: string;
}
