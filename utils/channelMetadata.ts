import { LiveChannel } from '../types';

export interface ChannelDetails {
    id: string;
    name: string;
    logo?: string;
    country?: string;
    languages: string[];
    website?: string;
    categories: string[];
}

export interface StreamServer {
    name: string;
    url: string;
    status?: string;
}

// Memory caches to avoid duplicate requests
let channelsCache: any[] | null = null;
let streamsCache: any[] | null = null;
let fetchPromise: Promise<{ channels: any[]; streams: any[] }> | null = null;

// Common ISO 639-3 language code mapping to English names
const LANGUAGE_MAP: Record<string, string> = {
    eng: "English", fra: "French", spa: "Spanish", deu: "German", 
    ita: "Italian", por: "Portuguese", rus: "Russian", zho: "Chinese", 
    hin: "Hindi", jpn: "Japanese", kor: "Korean", ara: "Arabic", 
    tur: "Turkish", nld: "Dutch", pol: "Polish", swe: "Swedish", 
    nor: "Norwegian", dan: "Danish", fin: "Finnish", ces: "Czech", 
    ron: "Romanian", hun: "Hungarian", ell: "Greek", heb: "Hebrew", 
    ind: "Indonesian", msa: "Malay", tha: "Thai", vie: "Vietnamese", 
    ben: "Bengali", tam: "Tamil", tel: "Telugu", mar: "Marathi", 
    pan: "Punjabi", guj: "Gujarati", kan: "Kannada", mal: "Malayalam",
    urd: "Urdu", ukr: "Ukrainian", hrv: "Croatian", srp: "Serbian", 
    bul: "Bulgarian", slk: "Slovak", slv: "Slovenian", est: "Estonian", 
    lav: "Latvian", lit: "Lithuanian", kat: "Georgian", aze: "Azerbaijani"
};

// Common ISO 3166-1 alpha-2 country code mapping
const COUNTRY_MAP: Record<string, string> = {
    US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
    IN: "India", FR: "France", DE: "Germany", IT: "Italy", ES: "Spain",
    JP: "Japan", KR: "South Korea", BR: "Brazil", RU: "Russia", CN: "China",
    MX: "Mexico", AR: "Argentina", ZA: "South Africa", NL: "Netherlands",
    SE: "Sweden", NO: "Norway", CH: "Switzerland", AT: "Austria",
    BE: "Belgium", DK: "Denmark", FI: "Finland", IE: "Ireland",
    NZ: "New Zealand", PT: "Portugal", PL: "Poland", TR: "Turkey",
    UA: "Ukraine", SG: "Singapore", MY: "Malaysia", TH: "Thailand",
    VN: "Vietnam", ID: "Indonesia", PH: "Philippines", PK: "Pakistan",
    BD: "Bangladesh", EG: "Egypt", SA: "Saudi Arabia", AE: "United Arab Emirates"
};

/**
 * Initializes and fetches channel metadata and streams from the iptv-org API.
 */
export function preloadChannelMetadata(): Promise<{ channels: any[]; streams: any[] }> {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            const [channelsRes, streamsRes] = await Promise.all([
                fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json()),
                fetch('https://iptv-org.github.io/api/streams.json').then(r => r.json())
            ]);
            channelsCache = channelsRes;
            streamsCache = streamsRes;
            return { channels: channelsRes, streams: streamsRes };
        } catch (e) {
            console.error("Failed to preload channel metadata:", e);
            channelsCache = [];
            streamsCache = [];
            return { channels: [], streams: [] };
        }
    })();

    return fetchPromise;
}

/**
 * Look up channel details and stream servers dynamically from the API databases.
 */
export async function getDynamicChannelDetails(channel: LiveChannel): Promise<{
    details: ChannelDetails | null;
    servers: StreamServer[];
}> {
    // Ensure data is preloaded
    const { channels, streams } = await preloadChannelMetadata();
    
    // Normalize search names
    const searchName = channel.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Find matching channel in API
    const matchedChannel = channels.find((c: any) => {
        const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cName === searchName) return true;
        // Check alt names
        if (c.alt_names && c.alt_names.length > 0) {
            return c.alt_names.some((alt: string) => alt.toLowerCase().replace(/[^a-z0-9]/g, '') === searchName);
        }
        return false;
    });

    const servers: StreamServer[] = [];
    
    // Always add the default URL from M3U as Server 1
    servers.push({
        name: "Server 1 (Default)",
        url: channel.url
    });

    if (!matchedChannel) {
        // Return default server if no match
        return { details: null, servers };
    }

    // Find all stream servers associated with this channel in streams.json
    const matchedStreams = streams.filter((s: any) => s.channel === matchedChannel.id && s.url !== channel.url);
    
    // Deduplicate and add other streams
    const seenUrls = new Set<string>([channel.url]);
    matchedStreams.forEach((s: any) => {
        if (!seenUrls.has(s.url)) {
            seenUrls.add(s.url);
            servers.push({
                name: `Server ${servers.length + 1}${s.feed ? ` - ${s.feed}` : ""}`,
                url: s.url
            });
        }
    });

    // Format details
    const mappedLanguages = (matchedChannel.languages || []).map((lang: string) => LANGUAGE_MAP[lang] || lang);
    const countryName = COUNTRY_MAP[matchedChannel.country] || matchedChannel.country;

    const details: ChannelDetails = {
        id: matchedChannel.id,
        name: matchedChannel.name,
        logo: matchedChannel.logo || channel.logo,
        country: countryName,
        languages: mappedLanguages.length > 0 ? mappedLanguages : ["Unknown"],
        website: matchedChannel.website,
        categories: matchedChannel.categories || []
    };

    return { details, servers };
}

/**
 * Returns a list of channel recommendations based on category / country.
 */
export async function getRecommendations(channel: LiveChannel, limit = 5): Promise<LiveChannel[]> {
    // We can recommend other channels from the active playlist that share the same group or country
    return []; // Handled inside LiveTV.tsx or LiveTVPlayer.tsx with activePlaylist context!
}
