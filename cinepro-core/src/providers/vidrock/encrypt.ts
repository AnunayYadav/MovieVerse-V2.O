import { webcrypto } from 'crypto';

const crypto = webcrypto;
const PASSPHRASE = 'x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9';

export async function encryptItemId(itemId: string) {
    try {
        const textEncoder = new TextEncoder();

        // Key is the passphrase
        const keyData = textEncoder.encode(PASSPHRASE);

        // IV is first 16 bytes of the key
        const iv = textEncoder.encode(PASSPHRASE.substring(0, 16));

        // Import the key for AES-CBC
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );

        // Encrypt using AES-CBC
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv: iv },
            key,
            textEncoder.encode(itemId)
        );

        // Base64 encode and make URL-safe (similar to VidSrcCC approach)
        const encryptedArray = new Uint8Array(encrypted);
        const binaryString = String.fromCharCode(...encryptedArray);
        const base64 = Buffer.from(binaryString, 'binary').toString('base64');

        // Convert to URL-safe base64: + -> -, / -> _, remove padding =
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (error) {
        throw error;
    }
}
