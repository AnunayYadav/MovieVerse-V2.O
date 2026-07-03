export interface EncryptedPayload {
    iv: string;
    tag: string;
    data: string;
}

export interface ApiResponse {
    status: string;
    requested: Requested;
    selected: Selected;
    switches: Switch[];
    stream: Stream;
    source: Source;
}

export interface Requested {
    id: number;
}

export interface Selected {
    file_code: string;
    lang_code: string;
    lang: string;
    title: string;
    source_title: string;
}

export interface Switch {
    id: number;
    title: string;
    main_id: string;
    secondary_id: string;
    file_code: string;
    lang_code: string;
    lang: string;
    thumbnail: string;
    embed_url: string;
    uploaded_at: string;
    created_at: string;
}

export interface Stream {
    status: string;
    title: string;
    hls_streaming: string;
    duration: string;
    thumbnail_small: string;
    thumbnail_medium: string;
    thumbnail_hd: string;
    download: Download[];
    preview_video: PreviewVideo[];
}

export interface Download {
    quality: string;
    url: string;
}

export interface PreviewVideo {
    url: string;
    frequency: number;
    height: number;
    width: number;
    count: number;
    tileWidth: number;
    tileHeight: number;
}

export interface Source {
    goal_api: string;
}
