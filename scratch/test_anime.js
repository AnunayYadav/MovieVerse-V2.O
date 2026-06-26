import { ANIME } from '@consumet/extensions';

const hianime = new ANIME.Hianime();

async function test() {
  console.log('Searching for "Naruto" using HiAnime...');
  try {
    const search = await hianime.search('Naruto');
    console.log('Search Results count:', search.results?.length ?? 0);
    if (search.results && search.results.length > 0) {
      const first = search.results[0];
      console.log('First result:', first.title, 'ID:', first.id);
      
      console.log('Fetching media info...');
      const info = await hianime.fetchMediaInfo(first.id);
      console.log('Media Info title:', info.title);
      console.log('Episodes count:', info.episodes ? info.episodes.length : 0);
      
      if (info.episodes && info.episodes.length > 0) {
        const ep = info.episodes[0];
        console.log('Fetching sources for episode ID:', ep.id);
        const sources = await hianime.fetchEpisodeSources(ep.id);
        console.log('Sources:', JSON.stringify(sources).substring(0, 300) + '...');
      }
    }
  } catch (err) {
    console.error('HiAnime failed:', err.message);
  }
}

test();
