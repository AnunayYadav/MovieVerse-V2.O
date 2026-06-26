import { MOVIES } from '@consumet/extensions';

const flixhq = new MOVIES.FlixHQ();

async function test() {
  try {
    console.log('Searching for "Spider-Man"...');
    const search = await flixhq.search('Spider-Man');
    console.log('Search Results count:', search.results.length);
    if (search.results.length > 0) {
      const first = search.results[0];
      console.log('First search result:', first);
      
      console.log('\nFetching info for ID:', first.id);
      const info = await flixhq.fetchMediaInfo(first.id);
      console.log('Media Info title:', info.title);
      console.log('Episodes count:', info.episodes ? info.episodes.length : 0);
      
      if (info.episodes && info.episodes.length > 0) {
        const firstEpisode = info.episodes[0];
        console.log('First Episode details:', firstEpisode);
        
        console.log('\nFetching sources for Episode ID:', firstEpisode.id);
        const sources = await flixhq.fetchEpisodeSources(firstEpisode.id);
        console.log('Sources:', JSON.stringify(sources, null, 2));
      }
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
