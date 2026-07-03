import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult,
    Source,
    Subtitle
} from '@omss/framework';

export class VidSrcProvider extends BaseProvider {
    readonly id = 'vidsrc';
    readonly name = 'VidSrc';
    readonly enabled = true;
    readonly BASE_URL = 'https://vsembed.ru/';
    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150 Safari/537.36',
        Referer: this.BASE_URL
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    /**
     * Fetch movie sources
     */
    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    /**
     * Fetch TV episode sources
     */
    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.getSources(media);
    }

    /**
     * Main scraping logic
     */
    private async getSources(
        media: ProviderMediaObject
    ): Promise<ProviderResult> {
        try {
            const pageUrl = this.buildPageUrl(media);

            const html = await this.fetchPage(pageUrl, media);
            if (!html) {
                return this.emptyResult('Failed to fetch page', media);
            }

            const secondUrl = this.extractSecondUrl(html);
            if (!secondUrl) {
                return this.emptyResult('Invalid or expired token', media);
            }

            const secondHtml = await this.fetchPage(secondUrl.url, media);
            if (!secondHtml) {
                return this.emptyResult('Failed to fetch stream page', media);
            }

            const thirdUrl = this.extractThirdUrl(secondHtml, secondUrl.url);
            if (!thirdUrl) {
                return this.emptyResult('Failed to extract stream URL', media);
            }

            const thirdHtml = await this.fetchPage(thirdUrl.url, media);
            if (!thirdHtml) {
                return this.emptyResult(
                    'Failed to fetch final stream page',
                    media
                );
            }

            const m3u8Urls = this.extractM3u8Urls(thirdHtml);
            if (!m3u8Urls || m3u8Urls.length === 0) {
                return this.emptyResult('Failed to extract m3u8 URLs', media);
            }

            const sources: Source[] = m3u8Urls.map((url) => ({
                url: this.createProxyUrl(url, {
                    ...this.HEADERS,
                    Referer: 'https://cloudnestra.com/',
                    Origin: 'https://cloudnestra.com'
                }),
                type: 'hls',
                quality: 'Auto',
                audioTracks: [
                    {
                        label: 'English',
                        language: 'eng'
                    }
                ],
                provider: {
                    id: this.id,
                    name: this.name
                }
            }));

            return {
                sources,
                subtitles: [],
                diagnostics: []
            };
        } catch (error) {
            return this.emptyResult(
                error instanceof Error
                    ? error.message
                    : 'Unknown provider error',
                media
            );
        }
    }

    /**
     * Build page URL based on media type
     */
    private buildPageUrl(media: ProviderMediaObject): string {
        if (media.type === 'movie') {
            return `${this.BASE_URL}/embed/movie?tmdb=${media.tmdbId}`;
        } else {
            return `${this.BASE_URL}/embed/tv?tmdb=${media.tmdbId}&season=${media.s}&episode=${media.e}`;
        }
    }

    /**
     * Fetch page HTML
     */
    private async fetchPage(
        url: string,
        media: ProviderMediaObject
    ): Promise<string | null> {
        try {
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }

            const response = await fetch(url, {
                headers: this.HEADERS
            });

            if (response.status !== 200) {
                return null;
            }

            return await response.text();
        } catch {
            return null;
        }
    }

    /**
     * Extract token, expires, and playlist URL from HTML
     */
    private extractSecondUrl(html: string): { url: string } | null {
        const src = html.match(
            /<iframe[^>]*\s+src=["']([^"']+)["'][^>]*>/i
        )?.[1];

        if (!src) {
            return null;
        }

        return { url: src };
    }

    /**
     * Extract third URL from inline JS (loadIframe)
     * and resolve it against the second URL domain
     */
    private extractThirdUrl(
        html: string,
        secondUrl: string
    ): { url: string } | null {
        const relSrc = html.match(/src:\s*['"]([^'"]+)['"]/i)?.[1];
        if (!relSrc) {
            return null;
        }

        if (secondUrl.startsWith('//')) {
            secondUrl = 'https:' + secondUrl;
        }

        let url: string;
        try {
            url = new URL(relSrc, secondUrl).href;
        } catch {
            return null;
        }

        return { url };
    }

    private extractM3u8Urls(thirdHtml: string): string[] | null {
        const fileField = thirdHtml.match(/file\s*:\s*["']([^"']+)["']/i)?.[1];
        if (!fileField) return null;

        const playerDomains = new Map<string, string>();
        playerDomains.set('{v1}', 'neonhorizonworkshops.com');
        playerDomains.set('{v2}', 'wanderlynest.com');
        playerDomains.set('{v3}', 'orchidpixelgardens.com');
        playerDomains.set('{v4}', 'cloudnestra.com');

        const rawUrls = fileField.split(/\s+or\s+/i);

        const m3u8Urls = rawUrls.map((template) => {
            let url = template;
            for (const [placeholder, domain] of playerDomains.entries()) {
                url = url.replace(placeholder, domain);
            }
            if (url.includes('{') || url.includes('}')) {
                return null;
            }
            return url;
        });

        const filteredM3u8Urls = m3u8Urls.filter(
            (url): url is string => url !== null
        );

        return filteredM3u8Urls.length > 0 ? filteredM3u8Urls : null;
    }

    /**
     * Return empty result with diagnostic
     */
    private emptyResult(
        message: string,
        media: ProviderMediaObject
    ): ProviderResult {
        return {
            sources: [],
            subtitles: [],
            diagnostics: [
                {
                    code: 'PROVIDER_ERROR',
                    message: `${this.name}: ${message}. Note that VidSrc blocks all kinds of VPN IPs, so if you are using one, try disabling it and see if that helps.`,
                    field: '',
                    severity: 'error'
                }
            ]
        };
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(this.BASE_URL, {
                method: 'HEAD',
                headers: this.HEADERS
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
