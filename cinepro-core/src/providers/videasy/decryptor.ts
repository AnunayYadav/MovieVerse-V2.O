// decryptor.ts
// calls enc-dec.app to decrypt videasy's encrypted blob.
// the blob is plain text hex returned directly from api.videasy.net.
// enc-dec.app handles the wasm/cryptojs decryption server-side.

const DEC_API = 'https://enc-dec.app/api/dec-videasy';

// response shape from enc-dec.app
interface DecApiResponse {
    status: number;
    result: {
        sources: Array<{ quality?: string; url: string; type?: string }>;
        subtitles: Array<{ url: string; lang?: string; language?: string }>;
    };
}

export interface DecryptedPayload {
    sources: Array<{ quality?: string; url: string; type?: string }>;
    subtitles: Array<{ url: string; lang?: string; language?: string }>;
}

// simple in-memory cache: key = `${tmdbId}:${blobHash}`, value = decrypted payload
// avoids re-calling the api for the same blob within a server session
const cache = new Map<string, DecryptedPayload>();

function blobKey(tmdbId: string, blob: string): string {
    // soo i think it's better to use first 32 chars of blob as a cheap fingerprint as blobs are unique per request
    return `${tmdbId}:${blob.slice(0, 32)}`;
}

export async function decryptResponse(
    blob: string,
    tmdbId: string
): Promise<DecryptedPayload | null> {
    if (!blob || blob.length < 10) return null;

    const key = blobKey(tmdbId, blob);
    if (cache.has(key)) return cache.get(key)!;

    try {
        const res = await fetch(DEC_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: blob, id: tmdbId })
        });

        if (!res.ok) return null;

        const json = (await res.json()) as DecApiResponse;

        if (json.status !== 200 || !json.result?.sources) return null;

        const payload: DecryptedPayload = {
            sources: json.result.sources ?? [],
            subtitles: json.result.subtitles ?? []
        };

        cache.set(key, payload);
        return payload;
    } catch {
        return null;
    }
}
