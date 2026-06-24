import { LIGHT_NOVELS } from '@consumet/extensions';

async function testNovelUpdates() {
  const provider = new LIGHT_NOVELS.NovelUpdates();
  console.log('Testing NovelUpdates search for "solo"...');
  try {
    const results = await provider.search('solo');
    console.log('Search Results:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Search failed:', err);
  }
}

testNovelUpdates();
