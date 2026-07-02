import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore
import worker from '../lib/anivexa/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const host = req.headers["host"] ?? "localhost";
    // Support path parameter from Vercel rewrites (req.query.path) or fallback to stripping prefix from req.url
    const pathParam = req.query.path as string | undefined;
    let cleanUrlPath = pathParam || req.url?.replace(/^\/api\/anime/, '') || '/';
    if (cleanUrlPath && !cleanUrlPath.startsWith('/')) {
      cleanUrlPath = '/' + cleanUrlPath;
    }
    const url = `https://${host}${cleanUrlPath}`;

    const chunks: any[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length ? Buffer.concat(chunks) : null;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers as any,
      body: body?.length ? body : undefined,
      duplex: "half",
    } as any);

    const response = await worker.fetch(request, {});

    res.statusCode = response.status;
    for (const [k, v] of response.headers) {
      res.setHeader(k, v);
    }

    const buf = await response.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (error: any) {
    console.error("Anivexa API Bridge Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
