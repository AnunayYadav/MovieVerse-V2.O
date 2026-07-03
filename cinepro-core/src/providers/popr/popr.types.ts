export type VidnestResponse = {
    success: boolean;
    results: {
        server: string;
        serverName: string;
        streams: {
            url: string;
            quality: string;
            isM3U8: boolean;
            headers?: {
                Referer?: string;
                Origin?: string;
            };
        }[];
        subtitles?: {
            url: string;
            format: string;
            lang: string;
        }[];
    }[];
};
