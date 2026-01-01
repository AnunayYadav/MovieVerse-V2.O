import crypto from 'crypto';

// This RegEx specifically looks for the concatenated string in vidsrc's code
const SECRET_REGEX = /qhksp\s*=\s*((?:'[^']+'\s*\+\s*)*'[^']+')/;

export async function getDynamicSecret() {
    try {
        // We fetch the provider's script to find the latest key
        const res = await fetch('https://vidsrc.cc/saas/js/embed.min.js', { cache: 'no-store' });
        const text = await res.text();
        const match = text.match(SECRET_REGEX);
        
        if (match) {
            // This turns "'abc' + 'def'" into "abcdef"
            return eval(match[1]); 
        }
    } catch (e) {
        console.error("Failed to resolve dynamic secret");
    }
    // Fallback to the key we found today
    return "XSuP4qMl+9tK17QNb+4+th2Pm9AWgM..."; 
}

export function decryptVidsrc(encryptedData, secretKey) {
    const iv = Buffer.alloc(16, 0); // The 16-zero-byte IV we identified
    const key = crypto.createHash('sha256').update(secretKey).digest(); // SHA-256 derivation

    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return null;
    }
}