import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult
} from '@omss/framework';

export class CineSuProvider extends BaseProvider {
    readonly id = 'CineSu';
    readonly name = 'CineSu';
    readonly enabled = true;
    readonly BASE_URL = 'https://cine.su';
    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: this.BASE_URL + '/en/watch',
        Origin: this.BASE_URL
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const streamurl = this.buildManifestUrl(media);
        const verify = await this.testUrl(streamurl);
        if (!verify) {
            return this.emptyResult('Stream URL is not accessible');
        }
        return this.getSources(streamurl);
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        const streamurl = this.buildManifestUrl(media);
        const verify = await this.testUrl(streamurl);
        if (!verify) {
            return this.emptyResult('Stream URL is not accessible');
        }
        return this.getSources(streamurl);
    }

    /**
     * Core logic
     */
    private async getSources(streamUrl: string): Promise<ProviderResult> {
        try {
            return {
                sources: [
                    {
                        url: this.createProxyUrl(streamUrl, this.HEADERS),
                        quality: '1080',
                        type: 'hls',
                        audioTracks: [
                            {
                                label: 'English',
                                language: 'eng'
                            }
                        ],
                        provider: {
                            name: this.name,
                            id: this.id
                        }
                    }
                ],
                subtitles: [],
                diagnostics: []
            };
        } catch (error) {
            return this.emptyResult(
                error instanceof Error
                    ? error.message
                    : 'Unknown provider error'
            );
        }
    }

    /**
     * Test if URL is accessible
     */
    private async testUrl(url: string): Promise<boolean> {
        try {
            const res = await fetch(url, {
                method: 'HEAD',
                headers: this.HEADERS
            });
            return res.status === 200;
        } catch {
            return false;
        }
    }

    /**
     * Build Manifest URL
     */
    private buildManifestUrl(media: ProviderMediaObject): string {
        if (media.type === 'movie') {
            return `${this.BASE_URL}/v1/stream/master/movie/${media.tmdbId}.m3u8`;
        }

        if (media.type === 'tv') {
            return `${this.BASE_URL}/v1/stream/master/tv/${media.tmdbId}/${media.s}/${media.e}.m3u8`;
        }

        throw new Error('Unsupported media type');
    }

    private emptyResult(message: string): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [
                {
                    code: 'PROVIDER_ERROR',
                    message: `${this.name}: ${message}`,
                    field: '',
                    severity: 'error'
                }
            ]
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const res = await fetch(this.BASE_URL, {
                method: 'HEAD',
                headers: this.HEADERS
            });
            return res.status === 200;
        } catch {
            return false;
        }
    }
}
