export type TulnexApiResponse = {
    v: string;
    payload: string;
};

export interface ExtractedStream {
    url: string;
    headers: Record<string, string> | null;
}
