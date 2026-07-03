export interface VidApiResponse {
    status_code: string;
    data: Data;
    default_subs: DefaultSub[];
}

export interface Data {
    title: string;
    imdb_id: string;
    season: string;
    episode: string;
    file_name: string;
    backdrop: string;
    stream_urls: string[];
}

export interface DefaultSub {
    lang: string;
    code: string;
    url: string;
}
