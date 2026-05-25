import fetch from 'node-fetch';

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/tmdb/movie/550?api_key=fe42b660a036f4d6a2bfeb4d0f523ce9');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text.slice(0, 500));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
