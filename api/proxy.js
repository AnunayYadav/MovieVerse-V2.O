// api/proxy.js
import crypto from 'crypto';

const MASTER_SECRET = "XSuP4qMl+9tK17QNb+4+th2Pm9AWgM..."; // Use the one we found

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        // 1. Fetch from provider
        const vapiRes = await fetch(`https://vidsrc.cc/vapi/movie/${id}`, {
            headers: { 'Referer': 'https://vidsrc.cc/' }
        });
        const data = await vapiRes.json();

        // 2. Decrypt using our identified logic
        const iv = Buffer.alloc(16, 0); 
        const key = crypto.createHash('sha256').update(MASTER_SECRET).digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(data.data.source, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        // 3. Return the plain link
        res.status(200).json({ url: decrypted });
    } catch (error) {
        res.status(500).json({ error: 'Decryption failed' });
    }
}