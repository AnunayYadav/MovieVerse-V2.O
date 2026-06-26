import { MOVIES } from '@consumet/extensions';

async function testProvider(name, instance) {
  console.log(`\nTesting provider: ${name}...`);
  try {
    const search = await instance.search('Spider-Man');
    console.log(`[${name}] Search Results count:`, search.results?.length ?? 0);
    if (search.results && search.results.length > 0) {
      const first = search.results[0];
      console.log(`[${name}] First result:`, first.title, 'ID:', first.id);
      
      console.log(`[${name}] Fetching media info...`);
      const info = await instance.fetchMediaInfo(first.id);
      console.log(`[${name}] Media Info title:`, info.title);
      
      if (info.episodes && info.episodes.length > 0) {
        const ep = info.episodes[0];
        console.log(`[${name}] Fetching sources for episode ID:`, ep.id);
        const sources = await instance.fetchEpisodeSources(ep.id);
        console.log(`[${name}] Sources:`, JSON.stringify(sources).substring(0, 300) + '...');
        return true;
      }
    }
  } catch (err) {
    console.error(`[${name}] Failed:`, err.message);
  }
  return false;
}

async function runAll() {
  const providers = {
    FlixHQ: new MOVIES.FlixHQ(),
    SFlix: new MOVIES.SFlix(),
    Goku: new MOVIES.Goku(),
    HiMovies: new MOVIES.HiMovies(),
    DramaCool: new MOVIES.DramaCool()
  };
  
  for (const [name, instance] of Object.entries(providers)) {
    const ok = await testProvider(name, instance);
    if (ok) {
      console.log(`\n>>> Success with provider: ${name}!`);
    }
  }
}

runAll();
