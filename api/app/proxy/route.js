import { getDynamicSecret, decryptVidsrc } from '@/lib/resolver';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const tmdbId = new URL(req.url).searchParams.get('id');
    
    // 1. Get the current secret key dynamically
    const secret = await getDynamicSecret();

    // 2. Fetch encrypted data from vidsrc
    const vapiRes = await fetch(`https://vidsrc.cc/vapi/movie/${tmdbId}`, {
        headers: { 'Referer': 'https://vidsrc.cc/' }
    });
    const json = await vapiRes.json();
    
    // 3. Decrypt the random string into the real .m3u8 link
    const streamUrl = decryptVidsrc(json.data.source, secret);

    return NextResponse.json({ url: streamUrl });
}