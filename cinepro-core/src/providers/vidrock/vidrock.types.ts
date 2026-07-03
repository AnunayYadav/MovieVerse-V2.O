export interface VidrockStreamInfo {
    url: string | null;
    language: string | null;
    flag: string | null;
}

export type VidrockStreams = Record<string, VidrockStreamInfo>;

export interface VidrockCDN {
    resolution: string;
    url: string;
}
