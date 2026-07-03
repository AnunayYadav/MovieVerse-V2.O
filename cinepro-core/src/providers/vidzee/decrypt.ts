export async function decrypt(
    encryptedData: string,
    decryptionKey: string
): Promise<string> {
    try {
        if (!encryptedData || !decryptionKey) return '';

        // Step 1: decode outer base64
        const decoded = atob(encryptedData);
        const [ivBase64, cipherBase64] = decoded.split(':');

        if (!ivBase64 || !cipherBase64) return '';

        // Step 2: decode IV and ciphertext
        const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
        const cipherBytes = Uint8Array.from(atob(cipherBase64), (c) =>
            c.charCodeAt(0)
        );

        // Step 3: correct key handling (IMPORTANT)
        const keyBytes = getKeyBytes(decryptionKey);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );

        // Step 4: decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv },
            cryptoKey,
            cipherBytes
        );

        const res = new TextDecoder().decode(decrypted);

        return res;
    } catch (err) {
        return '';
    }
}

function getKeyBytes(key: string): Uint8Array {
    // Treat key as UTF-8 string (LIKE CryptoJS)
    const encoded = new TextEncoder().encode(key);

    // CryptoJS pads/truncates to 32 bytes
    const result = new Uint8Array(32);
    result.set(encoded.slice(0, 32));

    return result;
}

export async function deriveKey(e: string): Promise<string> {
    try {
        if (!e) return '';

        const base64ToBytes = (e: string) => {
            const t = atob(e.replace(/\s+/g, ''));
            const n = t.length;
            const r = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
                r[i] = t.charCodeAt(i);
            }
            return r;
        };

        let t = base64ToBytes(e);

        if (t.length <= 28) return '';

        let n = t.slice(0, 12);
        let r = t.slice(12, 28);
        let a = t.slice(28);

        let i = new Uint8Array(a.length + r.length);
        i.set(a, 0);
        i.set(r, a.length);

        let encoder = new TextEncoder();
        let l = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode('4f2a9c7d1e8b3a6f0d5c2e9a7b1f4d8c')
        );

        let o = await crypto.subtle.importKey(
            'raw',
            l,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        let c = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: n,
                tagLength: 128
            },
            o,
            i
        );

        return new TextDecoder().decode(c);
    } catch (err) {
        return '';
    }
}
