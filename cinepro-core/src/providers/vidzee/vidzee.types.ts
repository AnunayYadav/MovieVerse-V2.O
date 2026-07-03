export type StreamResponse = {
    headers: Headers;
    provider: string;
    servers: Server[];
    url: StreamUrl[];
    tracks: Track[];
    proxy: boolean;
    thumbnail: string;
    serverInfo: ServerInfo;
};

export type Headers = {
    'User-Agent': string;
};

export type Server = unknown;

export type StreamUrl = {
    lang: string;
    link: string;
    type: 'hls' | string;
    message: string;
    name: string;
    flag: string;
};

export type Track = {
    lang: string;
    url: string;
};

export type ServerInfo = {
    number: number;
    name: string;
    flag: string;
    language: string;
};
